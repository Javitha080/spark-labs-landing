const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.resolve(__dirname, '../src'));
let updatedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace imports: import { motion ... } from "framer-motion" -> import { m ... } from "framer-motion"
  // Needs to handle various import styles
  if (content.includes('framer-motion')) {
    // Replace <motion.div to <m.div
    content = content.replace(/<motion\./g, '<m.');
    // Replace </motion.div> to </m.div>
    content = content.replace(/<\/motion\./g, '</m.');
    
    // Also replace AnimatePresence if needed? No, AnimatePresence is fine.
    // Replace import { motion, ... } or import { motion }
    // We can just regex replace the word motion with m in the import statement
    content = content.replace(/import\s+{([^}]*?)\bmotion\b([^}]*?)}\s+from\s+['"]framer-motion['"]/g, (match, p1, p2) => {
      return `import {${p1}m${p2}} from "framer-motion"`;
    });
    // Some might be import { motion } from 'framer-motion'
    content = content.replace(/import\s+{\s*motion\s*}\s+from\s+['"]framer-motion['"]/g, 'import { m } from "framer-motion"');
    
    // Sometimes it's used as motion(Component)
    content = content.replace(/\bmotion\(/g, 'm(');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      updatedCount++;
    }
  }
});

console.log(`Updated ${updatedCount} files to use 'm' instead of 'motion'`);
