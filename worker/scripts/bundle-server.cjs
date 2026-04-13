"use strict";

/**
 * Bundle the worker by spawning the **platform @esbuild/* binary** resolved from the
 * worker’s pinned `esbuild` package. We intentionally do **not** use `esbuild.buildSync`
 * / `lib/main.js`: it compares “host” (JS package) vs spawned binary versions and throws
 * when pnpm dedupes multiple esbuild versions (e.g. 0.27.4 JS vs 0.18.20 binary).
 *
 * Platform → package mapping matches esbuild’s own `install.js`.
 */

const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");

const knownWindowsPackages = {
  "win32 arm64 LE": "@esbuild/win32-arm64",
  "win32 ia32 LE": "@esbuild/win32-ia32",
  "win32 x64 LE": "@esbuild/win32-x64",
};

const knownUnixlikePackages = {
  "aix ppc64 BE": "@esbuild/aix-ppc64",
  "android arm64 LE": "@esbuild/android-arm64",
  "darwin arm64 LE": "@esbuild/darwin-arm64",
  "darwin x64 LE": "@esbuild/darwin-x64",
  "freebsd arm64 LE": "@esbuild/freebsd-arm64",
  "freebsd x64 LE": "@esbuild/freebsd-x64",
  "linux arm LE": "@esbuild/linux-arm",
  "linux arm64 LE": "@esbuild/linux-arm64",
  "linux ia32 LE": "@esbuild/linux-ia32",
  "linux mips64el LE": "@esbuild/linux-mips64el",
  "linux ppc64 LE": "@esbuild/linux-ppc64",
  "linux riscv64 LE": "@esbuild/linux-riscv64",
  "linux s390x BE": "@esbuild/linux-s390x",
  "linux x64 LE": "@esbuild/linux-x64",
  "linux loong64 LE": "@esbuild/linux-loong64",
  "netbsd arm64 LE": "@esbuild/netbsd-arm64",
  "netbsd x64 LE": "@esbuild/netbsd-x64",
  "openbsd arm64 LE": "@esbuild/openbsd-arm64",
  "openbsd x64 LE": "@esbuild/openbsd-x64",
  "sunos x64 LE": "@esbuild/sunos-x64",
};

const knownWebAssemblyFallbackPackages = {
  "android arm LE": "@esbuild/android-arm",
  "android x64 LE": "@esbuild/android-x64",
  "openharmony arm64 LE": "@esbuild/openharmony-arm64",
};

function pkgAndSubpathForCurrentPlatform() {
  const platformKey = `${process.platform} ${os.arch()} ${os.endianness()}`;
  if (platformKey in knownWindowsPackages) {
    return { pkg: knownWindowsPackages[platformKey], subpath: "esbuild.exe" };
  }
  if (platformKey in knownUnixlikePackages) {
    return { pkg: knownUnixlikePackages[platformKey], subpath: "bin/esbuild" };
  }
  if (platformKey in knownWebAssemblyFallbackPackages) {
    return {
      pkg: knownWebAssemblyFallbackPackages[platformKey],
      subpath: "bin/esbuild",
    };
  }
  throw new Error(
    `metrovision worker build: unsupported platform "${platformKey}" for esbuild`,
  );
}

const workerRoot = path.join(__dirname, "..");
const esbuildPkgJson = require.resolve("esbuild/package.json", {
  paths: [workerRoot],
});
const rq = createRequire(esbuildPkgJson);
const { pkg, subpath } = pkgAndSubpathForCurrentPlatform();

let esbuildBin;
try {
  esbuildBin = rq.resolve(`${pkg}/${subpath}`);
} catch (e) {
  throw new Error(
    `metrovision worker build: could not resolve ${pkg}/${subpath} from ${path.dirname(esbuildPkgJson)}. ` +
      `Install optional deps (pnpm, not --no-optional). ${e && e.message ? e.message : e}`,
  );
}

const args = [
  "src/server.ts",
  "--bundle",
  "--platform=node",
  "--format=esm",
  "--packages=external",
  "--target=node20",
  "--outfile=dist/server.mjs",
];

const run = spawnSync(esbuildBin, args, {
  cwd: workerRoot,
  stdio: "inherit",
});
if (run.error) {
  console.error(run.error);
  process.exit(1);
}
process.exit(run.status === null ? 1 : run.status);
