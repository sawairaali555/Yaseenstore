import { spawn } from 'node:child_process';

function duration(value) {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(value);
  if (!match) throw new Error(`Invalid build timeout: ${value}`);
  return Number(match[1]) * ({ ms: 1, s: 1000, m: 60000, h: 3600000 }[match[2] || 's']);
}

const timeout = duration(process.env.SITES_BUILD_TIMEOUT || '3m');
const grace = duration(process.env.SITES_BUILD_KILL_AFTER || '10s');
const child = spawn(process.argv[2], ['build'], { stdio: 'inherit', detached: true });
let expired = false;
let killTimer;
const signalGroup = signal => {
  try { process.kill(-child.pid, signal); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
};
const timer = setTimeout(() => {
  expired = true;
  console.error('Build timed out.');
  signalGroup('SIGTERM');
  killTimer = setTimeout(() => signalGroup('SIGKILL'), grace);
}, timeout);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => signalGroup(signal));
child.on('error', error => {
  clearTimeout(timer);
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => {
  clearTimeout(timer);
  clearTimeout(killTimer);
  process.exitCode = expired ? 124 : code ?? 1;
});
