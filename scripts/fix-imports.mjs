import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname, relative, posix } from 'path';

const ROOT = '/vercel/share/v0-project';

async function getAllFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, public, scripts, src (stale), user_read_only_context
      if (['node_modules', '.git', 'public', 'scripts', 'src', 'user_read_only_context', '.next'].includes(entry.name)) continue;
      files.push(...await getAllFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const fileDir = dirname(filePath);
  
  // Match all @/ imports: from "@/..." or from '@/...'
  const newContent = content.replace(
    /(from\s+["'])@\/([^"']+)(["'])/g,
    (match, prefix, importPath, suffix) => {
      // Compute the absolute path the @/ import points to
      const absoluteTarget = join(ROOT, importPath);
      // Compute relative path from the current file's directory to the target
      let rel = relative(fileDir, absoluteTarget);
      // Convert to posix separators
      rel = rel.split('\\').join('/');
      // Ensure it starts with ./ or ../
      if (!rel.startsWith('.')) {
        rel = './' + rel;
      }
      return `${prefix}${rel}${suffix}`;
    }
  );
  
  if (newContent !== content) {
    await writeFile(filePath, newContent, 'utf-8');
    console.log(`Fixed: ${relative(ROOT, filePath)}`);
    return 1;
  }
  return 0;
}

async function main() {
  const files = await getAllFiles(ROOT);
  console.log(`Found ${files.length} TypeScript files to check`);
  
  let fixedCount = 0;
  for (const file of files) {
    fixedCount += await fixFile(file);
  }
  console.log(`\nFixed ${fixedCount} files`);
}

main().catch(console.error);
