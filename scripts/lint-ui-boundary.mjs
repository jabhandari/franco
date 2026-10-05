// FRA-21 strict UI boundary lint.
// Everything outside src/components/ui/ must compose the shared component
// library — no intrinsic JSX elements, no style={} props. This check parses
// each file's real AST (via @babel/parser), so JSX inside strings, comments,
// or comparisons can never cause false positives, and real elements can
// never be missed by a regex.
//
// Usage: node scripts/lint-ui-boundary.mjs  (exit 1 on any violation)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(join(process.cwd(), 'scripts', 'lint-ui-boundary.mjs'));
const { parse } = require('@babel/parser');

const SRC = join(process.cwd(), 'src');
const UI_DIR = join(SRC, 'components', 'ui');

const INTRINSIC = new Set([
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'ul', 'ol', 'li', 'button', 'input', 'select', 'option',
  'textarea', 'label', 'form', 'section', 'article', 'main',
  'header', 'footer', 'aside', 'nav', 'img', 'audio', 'video',
  'table', 'details', 'summary', 'small', 'strong', 'em', 'b',
  'i', 'br', 'hr', 'svg', 'path', 'pre', 'code',
]);

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (full === UI_DIR || full.startsWith(UI_DIR + '/')) continue;
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, out);
    else if (/\.(jsx|js)$/.test(entry)) out.push(full);
  }
  return out;
}

const violations = [];

for (const file of collectFiles(SRC)) {
  const code = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  } catch (error) {
    violations.push(`${relative(process.cwd(), file)}: unparsable (${error.message.split('\n')[0]})`);
    continue;
  }

  // Iterative walk — no @babel/traverse dependency needed.
  const stack = [ast];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      const nameNode = node.openingElement?.name;
      if (nameNode?.type === 'JSXIdentifier' && INTRINSIC.has(nameNode.name)) {
        const { line, column } = node.loc.start;
        violations.push(`${relative(process.cwd(), file)}:${line}:${column + 1}: intrinsic <${nameNode.name}>`);
      }
    }
    if (node.type === 'JSXAttribute' && node.name?.name === 'style') {
      const { line, column } = node.loc.start;
      violations.push(`${relative(process.cwd(), file)}:${line}:${column + 1}: style={} prop`);
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'leadingComments' || key === 'trailingComments') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) if (item?.type) stack.push(item);
      } else if (child?.type) {
        stack.push(child);
      }
    }
  }
}

if (violations.length) {
  console.error(`UI boundary violations: ${violations.length}`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}
console.log('UI boundary OK: no intrinsic JSX elements or style={} props outside src/components/ui/.');
