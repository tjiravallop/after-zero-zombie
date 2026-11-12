import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

function buildStandaloneHtml() {
  const indexHtmlPath = path.join(distDir, 'index.html');
  const engineJsPath = path.join(distDir, 'after-zero-bundle.js');
  const assetsDir = path.join(distDir, 'assets');

  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error('dist/index.html not found. Run vite build first.');
  }

  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  const engineJs = fs
    .readFileSync(engineJsPath, 'utf8')
    .replace(/<\/script/gi, '<\\/script');

  const assetFiles = fs.readdirSync(assetsDir);
  const cssFile = assetFiles.find(f => f.endsWith('.css'));
  const entryUrl = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/i)?.[1];
  const jsFile = entryUrl ? path.basename(entryUrl) : undefined;
  if (!jsFile || !assetFiles.includes(jsFile)) throw new Error('Built module entry is missing');
  if (assetFiles.filter(file => file.endsWith('.js')).length !== 1) throw new Error('Standalone export requires a single JavaScript bundle');

  const cssContent = cssFile
    ? fs.readFileSync(path.join(assetsDir, cssFile), 'utf8')
    : '';
  const jsContent = jsFile
    ? fs
        .readFileSync(path.join(assetsDir, jsFile), 'utf8')
        .replace(/<\/script/gi, '<\\/script')
    : '';

  // Remove the file:// protocol blocker script since this standalone HTML inlines everything
  html = html.replace(
    /<script>\s*if\s*\(\s*location\.protocol\s*===\s*'file:'\s*\)\s*\{[\s\S]*?\}\s*<\/script>/i,
    ''
  );

  // Inline after-zero-bundle.js
  html = html.replace(
    /<script[^>]*src="[^"]*after-zero-bundle\.js[^"]*"[^>]*><\/script>/i,
    () => `<script>\n${engineJs}\n</script>`
  );

  // Remove stylesheet link and main module script tag, then inject inline <style> and <script type="module">
  html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="[^"]*\/assets\/[^"]*"[^>]*>/gi, '');
  html = html.replace(
    /<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/gi,
    ''
  );

  html = html.replace(
    /<\/head>/i,
    () => `<style>\n${cssContent}\n</style>\n</head>`
  );

  html = html.replace(
    /<\/body>/i,
    () => `<script type="module">\n${jsContent}\n</script>\n</body>`
  );

  const outPublic = path.join(publicDir, 'after-zero-bangkok-standalone.html');
  const outDist = path.join(distDir, 'after-zero-bangkok-standalone.html');
  fs.writeFileSync(outPublic, html, 'utf8');
  fs.writeFileSync(outDist, html, 'utf8');
  console.log(
    `Created standalone HTML: ${(fs.statSync(outDist).size / 1024).toFixed(1)} KB`
  );
}

function buildProjectZip() {
  const zipPathPublic = path.join(publicDir, 'after-zero-bangkok-project.zip');
  const zipPathDist = path.join(distDir, 'after-zero-bangkok-project.zip');

  if (fs.existsSync(zipPathPublic)) fs.unlinkSync(zipPathPublic);
  if (fs.existsSync(zipPathDist)) fs.unlinkSync(zipPathDist);

  const pyScript = `
import os, zipfile

root = ${JSON.stringify(rootDir)}
out_zip = ${JSON.stringify(zipPathPublic)}
include_items = [
    'src',
    'scripts',
    '.github',
    'index.html',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'metadata.json',
    'README.md',
    '.gitignore',
    'เล่นเกม.cmd',
    'public/.nojekyll',
    'public/after-zero-bundle.js',
    'public/after-zero-bangkok-standalone.html',
    'public/assets',
    'dist/index.html',
    'dist/after-zero-bundle.js',
    'dist/after-zero-bangkok-standalone.html',
    'dist/assets',
]

with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in include_items:
        full_path = os.path.join(root, item)
        if not os.path.exists(full_path):
            continue
        if os.path.isfile(full_path):
            zf.write(full_path, item)
        else:
            for dirpath, dirnames, filenames in os.walk(full_path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    rel = os.path.relpath(fp, root)
                    zf.write(fp, rel)
`;
  let res = spawnSync('python', ['-c', pyScript], { stdio: 'inherit' });
  if (res.status !== 0) {
    res = spawnSync('py', ['-c', pyScript], { stdio: 'inherit' });
  }
  if (res.status !== 0) {
    res = spawnSync('python3', ['-c', pyScript], { stdio: 'inherit' });
  }
  if (res.status !== 0) {
    throw new Error('Failed to create zip');
  }
  fs.copyFileSync(zipPathPublic, zipPathDist);
  console.log(
    `Created project ZIP: ${(fs.statSync(zipPathPublic).size / 1024).toFixed(1)} KB`
  );
}

buildStandaloneHtml();
if (!process.argv.includes('--standalone-only')) buildProjectZip();
