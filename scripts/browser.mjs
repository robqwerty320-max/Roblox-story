// Chrome/Chromium path that works on Windows and in Linux cloud sandboxes.
// Override with CHROME_PATH. Returns undefined to let Remotion use its own downloaded headless shell.
import fs from "node:fs";
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
];
export const chromePath = () => CANDIDATES.find((p) => p && fs.existsSync(p));
// Windows: ANGLE on the GPU. Linux without a GPU: SwiftShader (software WebGL, slow but works).
export const glMode = () => process.env.REMOTION_GL || (process.platform === "win32" ? "angle" : "swangle");
