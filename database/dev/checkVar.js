import fs from 'fs';
import path from 'path';
const file = process.argv[2] || './index.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const undeclared = [];
lines.forEach((line, i) => {
  const match = line.match(/^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
  if (match) {
    const indent = match[1];
    const varName = match[2];
    if (!/^\s*(const|let|var|function|class|export|import|\/\/|\/\*)/.test(line)) {
      if (!/[=!<>]={1,2}/.test(line.replace(varName, ''))) {
        undeclared.push({ line: i + 1, varName, code: line.trim() });
      }
    }
  }
});

if (undeclared.length === 0) {
  console.log('✅ Nenhuma variável sem declaração encontrada.');
} else {
  console.log(`⚠️ ${undeclared.length} variável(eis) sem declaração:\n`);
  undeclared.forEach(({ line, varName, code }) => {
    console.log(`Linha ${line}: ${varName}\n  → ${code}\n`);
  });
}