// Usage:
//   node render.mjs stills 0.5,2.5,4.5 out_dir [sub]   -> PNG stills
//   node render.mjs video out.mp4 [sub] [start] [end]  -> 60 fps H.264 (video only)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { chromePath } from '../../scripts/browser.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const PROJECT = path.resolve(HERE, '../..');
const FONTS = process.platform === 'win32' ? 'C:/Windows/Fonts' : '/usr/share/fonts/truetype';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.TTF': 'font/ttf' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u.startsWith('/fonts/') ? path.join(FONTS, u.slice(7)) : (u.startsWith('/node_modules/') ? path.join(PROJECT, u) : path.join(HERE, u));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;

const [mode, a1, a2, a3, a4, a5] = process.argv.slice(2);
const sub = +(mode === 'stills' ? (a3 || 8) : (a2 || 8));
const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: 'new',
  args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--window-size=1080,1920'],
  defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/src/index.html?render=1&sub=${sub}`, { waitUntil: 'load' });
await page.waitForFunction('window.sceneReady === true', { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
console.log('renderer:', await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; }));

const shot = async t => { await page.evaluate(t => window.renderAt(t), t); return page.screenshot({ type: 'jpeg', quality: 96, optimizeForSpeed: true }); };

if (mode === 'stills') {
  fs.mkdirSync(a2, { recursive: true });
  for (const t of a1.split(',').map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(a2, `t${t.toFixed(2)}.png`) });
    console.log('still', t);
  }
} else {
  const fps = 60, start = +(a3 || 0), end = +(a4 || 10);
  const n0 = Math.round(start * fps), n1 = Math.round(end * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(fps), a1], { stdio: ['pipe', 'inherit', 'inherit'] });
  const T0 = Date.now();
  for (let f = n0; f < n1; f++) {
    const buf = await shot(f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 30 === 0) console.log(`frame ${f}/${n1}  ${((Date.now() - T0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close(); server.close();
