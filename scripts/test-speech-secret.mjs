import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const build = spawnSync(process.execPath, [join(process.cwd(), 'node_modules/vite/bin/vite.js'), 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

const localEnv = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const localKey = localEnv.match(/^GROQ_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
const keys = [process.env.GROQ_API_KEY, localKey].filter(Boolean);
const markers = ['GROQ_API_KEY', 'SPEECH_PROVIDER_TIMEOUT_MS', 'gsk_'];
function checkDirectory(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, item.name);
    if (item.isDirectory()) checkDirectory(full);
    else {
      const bytes = readFileSync(full);
      const text = bytes.toString('utf8');
      if ([...markers, ...keys].some((marker) => text.includes(marker))) {
        throw new Error('A server speech secret or setting appeared in the browser build.');
      }
    }
  }
}
checkDirectory('dist');
console.log('speech bundle secret check passed');
