const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── ANSI ─────────────────────────────────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
};
const W   = c.bold + c.white;
const DIM = c.dim;
const GRN = c.green;
const CYN = c.cyan;
const RST = c.reset;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PAD   = '  ';
const SEP   = DIM + '─'.repeat(50) + RST;
const WIDTH = 14;    // label column width

// ─── STATE ────────────────────────────────────────────────────────────────────
let botProcess     = null;
let isShuttingDown = false;
const startTime    = Date.now();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function elapsed() {
  return ((Date.now() - startTime) / 1000).toFixed(1) + 's';
}

function label(name) {
  return DIM + name.padEnd(WIDTH) + RST;
}

function tick(name, value) {
  process.stdout.write(
    PAD + GRN + '✓' + RST + '  ' + label(name) + W + value + RST + '\n'
  );
}

function warn(name, value) {
  process.stdout.write(
    PAD + c.yellow + '!' + RST + '  ' + label(name) + DIM + value + RST + '\n'
  );
}

function fail(name, value) {
  process.stdout.write(
    PAD + c.red + '✕' + RST + '  ' + label(name) + c.red + value + RST + '\n'
  );
}

// Spinner ─────────────────────────────────────────────────────────────────────
const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
let   spinnerTimer = null;
let   spinnerFrame = 0;

function startSpinner(text) {
  clearSpinner();
  spinnerFrame = 0;
  spinnerTimer = setInterval(() => {
    process.stdout.write(
      `\r${PAD}${CYN}${FRAMES[spinnerFrame++ % FRAMES.length]}${RST}  ${DIM}${text}${RST}   `
    );
  }, 80);
}

function clearSpinner() {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
    process.stdout.write('\r\x1b[2K');
  }
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function printHeader() {
  console.clear();
  process.stdout.write('\n');
  process.stdout.write(PAD + c.bold + c.white + 'CYBORK' + RST + CYN + '  CORE' + RST + '\n');
  process.stdout.write(PAD + DIM + 'Discord Infrastructure' + RST + '\n');
  process.stdout.write('\n');
  process.stdout.write(PAD + SEP + '\n');
  process.stdout.write('\n');
}

// ─── SYSTEM CHECK ─────────────────────────────────────────────────────────────
function systemCheck() {
  return new Promise((resolve) => {
    startSpinner('verifying system');

    const ensureLogs = () => {
      const logsDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

      // remove logs older than 7 days
      try {
        const now = Date.now();
        fs.readdirSync(logsDir).forEach((f) => {
          const fp = path.join(logsDir, f);
          if (now - fs.statSync(fp).mtimeMs > 7 * 86400000) fs.unlinkSync(fp);
        });
      } catch (_) {}
    };

    ensureLogs();

    exec('npm install --no-fund --no-audit --silent', (err) => {
      clearSpinner();
      if (err) {
        warn('system', 'verified with warnings');
      } else {
        tick('system', 'verified');
      }
      resolve();
    });
  });
}

// ─── BOT PROCESS ──────────────────────────────────────────────────────────────
function startBot() {
  startSpinner('loading bot');

  const bot = spawn('node', ['bot.js'], {
    cwd: __dirname,
    stdio: 'pipe',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });

  // Only lines we care about
  const SIGNAL_RE = /^CYBORK:([A-Z]+):(.+)$/;

  bot.stdout.on('data', (chunk) => {
    chunk.toString().split('\n').forEach((raw) => {
      const line = raw.trim();
      if (!line) return;

      const m = line.match(SIGNAL_RE);
      if (!m) return; // suppress everything else

      clearSpinner();
      const [, type, payload] = m;

      switch (type) {
        case 'COMMANDS': {
          const [cmds, slash] = payload.split(':');
          tick('commands', `${cmds}  ${DIM}·${RST}  ${cmds > 0 ? slash : 0} slash`);
          startSpinner('registering events');
          break;
        }
        case 'EVENTS': {
          tick('events', `${payload} handlers`);
          startSpinner('connecting database');
          break;
        }
        case 'DATABASE': {
          tick('database', payload.toLowerCase());
          startSpinner('logging in');
          break;
        }
        case 'ONLINE': {
          tick('client', payload);
          process.stdout.write('\n');
          process.stdout.write(PAD + SEP + '\n');
          process.stdout.write(
            PAD + GRN + c.bold + '✓  ready' + RST +
            DIM + '  ·  ' + RST +
            W + elapsed() + RST + '\n'
          );
          process.stdout.write('\n');
          break;
        }
      }
    });
  });

  bot.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (!msg || isShuttingDown) return;
    // Only surface genuine errors — skip node warnings
    if (msg.includes('DeprecationWarning') || msg.includes('ExperimentalWarning')) return;
    if (msg.includes('(Use `node --trace')) return;
    clearSpinner();
    fail('error', msg.split('\n')[0].slice(0, 80));
  });

  bot.on('close', (code) => {
    if (isShuttingDown) return;
    clearSpinner();
    if (code !== 0 && code !== null) {
      process.stdout.write('\n');
      warn('restart', `process exited (${code}) — restarting in 5s`);
      setTimeout(() => { if (!isShuttingDown) botProcess = startBot(); }, 5000);
    }
  });

  bot.on('error', (err) => {
    if (!isShuttingDown) { clearSpinner(); fail('process', err.message); }
  });

  return bot;
}

// ─── SHUTDOWN ─────────────────────────────────────────────────────────────────
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  clearSpinner();
  process.stdout.write('\n');
  process.stdout.write(PAD + DIM + 'shutting down…' + RST + '\n\n');
  if (botProcess) botProcess.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1200);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException',   (e) => { clearSpinner(); fail('exception', e.message); });
process.on('unhandledRejection',  (r) => { clearSpinner(); fail('rejection', String(r).slice(0, 80)); });

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  printHeader();
  await systemCheck();
  process.stdout.write('\n');
  botProcess = startBot();
}

main().catch((e) => { fail('startup', e.message); process.exit(1); });
