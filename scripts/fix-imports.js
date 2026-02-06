const { readdir, readFile, writeFile } = require('fs/promises');
const { join, dirname, relative, resolve } = require('path');

// __dirname is the scripts/ folder, go up one level for project root
const ROOT = resolve(__dirname, '..');

console.log('Project root: ' + ROOT);

async function getAllFiles(dir) {
  var entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.log('Cannot read dir: ' + dir + ' - ' + e.message);
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'public', 'scripts', 'src', 'user_read_only_context', '.next'].includes(entry.name)) continue;
      files.push(...(await getAllFiles(fullPath)));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const fileDir = dirname(filePath);

  const newContent = content.replace(
    /(from\s+["'])@\/([^"']+)(["'])/g,
    function (match, prefix, importPath, suffix) {
      var absoluteTarget = join(ROOT, importPath);
      var rel = relative(fileDir, absoluteTarget);
      rel = rel.split('\\').join('/');
      if (!rel.startsWith('.')) {
        rel = './' + rel;
      }
      return prefix + rel + suffix;
    }
  );

  if (newContent !== content) {
    await writeFile(filePath, newContent, 'utf-8');
    console.log('Fixed: ' + relative(ROOT, filePath));
    return 1;
  }
  return 0;
}

async function main() {
  const files = await getAllFiles(ROOT);
  console.log('Found ' + files.length + ' TypeScript files to check');

  var fixedCount = 0;
  for (var i = 0; i < files.length; i++) {
    fixedCount += await fixFile(files[i]);
  }
  console.log('Done. Fixed ' + fixedCount + ' files');
}

main().catch(console.error);
