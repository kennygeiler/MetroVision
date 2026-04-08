/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS postinstall helper */
const { existsSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const installJs = path.join(__dirname, "..", "node_modules", "ffmpeg-static", "install.js");
let bundledPath;
try {
  bundledPath = require("ffmpeg-static");
} catch {
  process.exit(0);
}

if (typeof bundledPath === "string" && bundledPath.length > 0 && existsSync(bundledPath)) {
  process.exit(0);
}

try {
  execFileSync(process.execPath, [installJs], { stdio: "inherit" });
} catch {
  process.exit(0);
}
