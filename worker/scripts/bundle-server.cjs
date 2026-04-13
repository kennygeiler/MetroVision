"use strict";

/**
 * Bundle the worker without `pnpm exec esbuild`: some CI/Docker layers ship a broken
 * pnpm `.bin/esbuild` shim (shell parses JS → "Syntax error: '(' unexpected").
 *
 * Do **not** run `esbuild/install.js` here: re-running it validates `esbuild --version`
 * against package.json and throws if another hoisted binary (e.g. older esbuild) is on disk.
 * `buildSync` resolves the correct package-local binary via the esbuild JS API.
 */

const path = require("node:path");

const workerRoot = path.join(__dirname, "..");

// Resolve from worker package root (not cwd) so monorepo hoisting cannot pick another esbuild.
const esbuild = require(require.resolve("esbuild", { paths: [workerRoot] }));

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
