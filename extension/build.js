#!/usr/bin/env node
// Bundles `popup.src.js` (ES modules + @supabase/supabase-js) into a single
// file that Chrome/Firefox can load with `script-src 'self'` CSP.
//
// Usage:
//   node build.js            # one-shot build
//   node build.js --watch    # rebuild on change
//
// The output file `popup.bundle.js` is committed so consumers do not need
// to run `npm install` before loading the unpacked extension.

const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [path.join(__dirname, 'popup.src.js')],
  outfile: path.join(__dirname, 'popup.bundle.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110', 'firefox115'],
  // Minify the committed bundle so the repo stays under a reasonable size.
  // The sourcemap is emitted next to it for local debugging but is gitignored
  // (see extension/.gitignore).
  sourcemap: true,
  legalComments: 'eof',
  minify: true,
  logLevel: 'info',
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('Watching popup.src.js for changes…');
  } else {
    await esbuild.build(options);
    console.log('Built popup.bundle.js');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
