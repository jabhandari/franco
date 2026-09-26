import { spawn } from 'node:child_process';

const commands = [
  ['api', 'npm run api'],
  ['web', 'npm run web']
];

const children = commands.map(([name, command]) => {
  const child = spawn(command, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`));
  child.on('exit', (code) => {
    if (code && !shuttingDown) process.exitCode = code;
    shutdown();
  });

  return child;
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
