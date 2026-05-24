const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/admin/LearningHubManager.tsx';
const destDir = 'src/components/admin/learning';
const content = fs.readFileSync(srcFile, 'utf8');

const tabs = [
  'DashboardTab',
  'ClassroomTab',
  'CoursesTab',
  'CurriculumTab',
  'CourseManagerTab',
  'WorkshopsTab',
  'ResourcesTab',
  'EnrollmentsTab',
  'ReviewsTab',
  'DiscussionsTab',
  'ContentTab'
];

// Extract everything before DashboardTab
const dashboardIndex = content.indexOf('function DashboardTab');
const headerContent = content.substring(0, dashboardIndex);

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

let mainFileContent = headerContent + '\n';
tabs.forEach(tab => {
  mainFileContent = `import ${tab} from "@/components/admin/learning/${tab}";\n` + mainFileContent;
});

let remainingContent = content.substring(dashboardIndex);

tabs.forEach((tab, i) => {
  const nextTab = tabs[i + 1];
  let tabEndIndex = remainingContent.length;
  
  if (nextTab) {
    const nextTabIndex = remainingContent.indexOf(`function ${nextTab}`);
    if (nextTabIndex !== -1) {
      tabEndIndex = nextTabIndex;
    }
  } else {
    tabEndIndex = remainingContent.indexOf('const LearningHubManager = () => {');
  }

  // Backtrack to previous comment block if there is one
  const tabContentStr = remainingContent.substring(0, tabEndIndex);
  
  // Actually, let's just grab the function using simple string splitting
  // Because there are separator comments like "// ═══════════════════════════════════════════"
  const commentIndex = tabContentStr.lastIndexOf('// ═══════════════════════════════════════════');
  
  let actualTabContent = tabContentStr;
  if (commentIndex !== -1 && commentIndex < tabContentStr.indexOf(`function ${tab}`)) {
      actualTabContent = tabContentStr.substring(commentIndex);
  }

  // For the next iteration
  remainingContent = remainingContent.substring(tabEndIndex);

  // Write the tab file
  let newTabFileContent = headerContent;
  
  // We need to export the tab function
  let exportedContent = actualTabContent.replace(`function ${tab}`, `export default function ${tab}`);
  
  newTabFileContent += exportedContent;
  
  fs.writeFileSync(path.join(destDir, `${tab}.tsx`), newTabFileContent);
  console.log(`Created ${tab}.tsx`);
});

// Finally, add the main component
const mainComponentStr = remainingContent;
mainFileContent += '\n' + mainComponentStr;

fs.writeFileSync(srcFile, mainFileContent);
console.log('Updated LearningHubManager.tsx');
