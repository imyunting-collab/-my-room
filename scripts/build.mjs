// Build MY ROOM with esbuild: bundle, copy public assets, write a precaching service worker.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const serveMode = process.argv.includes('--serve');
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyDir(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); } else fs.copyFileSync(s, d);
  }
}

const common = {
  entryPoints: { app: 'src/main.tsx' },
  bundle: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  outdir: out,
  entryNames: '[name]',
  loader: { '.woff2': 'file', '.png': 'file' },
  define: { 'process.env.NODE_ENV': serveMode ? '"development"' : '"production"' },
  logLevel: 'info',
};

function writeShell(version) {
  copyDir('public', out);
  const html = fs.readFileSync('index.html', 'utf8').replaceAll('%VERSION%', version);
  fs.writeFileSync(path.join(out, 'index.html'), html);
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else if (!p.endsWith('.map') && !p.endsWith('sw.js')) files.push(path.relative(out, p).split(path.sep).join('/'));
    }
  })(out);
  const sw = fs.readFileSync('src/sw-template.js', 'utf8')
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(['./', ...files]));
  fs.writeFileSync(path.join(out, 'sw.js'), sw);
}

if (serveMode) {
  const ctx = await esbuild.context({ ...common, sourcemap: true });
  await ctx.rebuild();
  writeShell('dev-' + Date.now());
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: out, port: 5173 });
  console.log(`MY ROOM dev server: http://localhost:${port}`);
} else {
  await esbuild.build({ ...common, minify: true, sourcemap: false, metafile: false });
  const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(out, 'app.js'))).update(fs.readFileSync(path.join(out, 'app.css'))).digest('hex').slice(0, 10);
  writeShell(hash);
  console.log('build ok →', out, 'version', hash);
}
