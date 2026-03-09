const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.env.TEMP + "/eslint-out.json", "utf8"));
data.forEach((f) => {
  if (f.messages.length === 0) return;
  const short = f.filePath.replace(/.*spark-labs-landing[\\/]/, "");
  f.messages.forEach((m) => {
    const sev = m.severity === 2 ? "E" : "W";
    const msg = (m.message || "").split("\n")[0].slice(0, 100);
    console.log(`${short}|${m.line}:${m.column}|${sev}|${m.ruleId || "unknown"}|${msg}`);
  });
});
