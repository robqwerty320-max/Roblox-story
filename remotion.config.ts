import { Config } from "@remotion/cli/config";
import fs from "node:fs";
// Windows: GPU via ANGLE + local Chrome. Linux cloud (no GPU): software WebGL via SwiftShader, Remotion's own headless shell.
const win = process.platform === "win32";
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as any) || (win ? "angle" : "swangle"));
const chrome = process.env.CHROME_PATH || (win ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "");
if (chrome && fs.existsSync(chrome)) Config.setBrowserExecutable(chrome);
