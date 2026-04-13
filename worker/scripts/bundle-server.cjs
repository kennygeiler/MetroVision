"use strict";

/**
 * Bundle the worker without `pnpm exec esbuild`: in some CI/Docker installs the
 * pnpm `.bin/esbuild` shim is invalid (shell sees JS / wrong file → "Syntax error: '(' unexpected").
 * Running esbuild's install.js first materializes `bin/esbuild`; the JS API then spawns it correctly.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const workerRoot = path.join(__dirname, "..");
const esbuildDir = path.dirname(
  require.resolve("esbuild/package.json", { paths: [workerRoot] }),
);
const installJs = path.join(esbuildDir, "install.js");

const install = spawnSync(process.execPath, [installJs], {
  stdio: "inherit",
  cwd: esbuildDir,
});
if (install.status !== 0) {
  process.exit(install.status === null ? 1 : install.status);
}

const esbuild = require("esbuild");
esbuild.buildSync({
  absWorkingDir: workerRoot,
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node20",
  outfile: "dist/server.mjs",
});
