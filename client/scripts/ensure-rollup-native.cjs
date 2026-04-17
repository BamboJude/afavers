const { execSync } = require('node:child_process');

const ROLLUP_NATIVE_VERSION = '4.59.0';

function linuxNativePackage() {
  if (process.platform !== 'linux' || process.arch !== 'x64') return null;

  const report = typeof process.report?.getReport === 'function'
    ? process.report.getReport()
    : null;
  const isGlibc = Boolean(report?.header?.glibcVersionRuntime);

  return isGlibc
    ? '@rollup/rollup-linux-x64-gnu'
    : '@rollup/rollup-linux-x64-musl';
}

const nativePackage = linuxNativePackage();

if (!nativePackage) {
  process.exit(0);
}

try {
  require.resolve(nativePackage);
} catch {
  console.log(`Installing missing Rollup native package: ${nativePackage}`);
  execSync(`npm install --no-save --include=optional ${nativePackage}@${ROLLUP_NATIVE_VERSION}`, {
    stdio: 'inherit',
    cwd: __dirname + '/..',
  });
}
