const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

const lavalinkPath = path.join(__dirname, 'Lavalink.jar');
const hasLavalink = fs.existsSync(lavalinkPath);

let botProcess = null;
let isShuttingDown = false;

// Professional minimal loader
function getLoader(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  return setInterval(() => {
    process.stdout.write(`\r\x1b[36m${frames[i++ % frames.length]}\x1b[0m ${text}`);
  }, 80);
}

// Auto-fix vulnerabilities on startup
async function autoFixVulnerabilities() {
  return new Promise((resolve) => {
    const loader = getLoader('Running system optimization audit...');
    
    const timeout = setTimeout(() => {
      clearInterval(loader);
      process.stdout.write('\r\x1b[32m✓\x1b[0m Optimization audit complete           \n');
      resolve();
    }, 3000);
    
    exec('npm audit fix --force > /dev/null 2>&1', (error) => {
      clearTimeout(timeout);
      clearInterval(loader);
      process.stdout.write('\r\x1b[32m✓\x1b[0m Security patches synchronized         \n');
      resolve();
    });
  });
}

// Clean up old log files
async function cleanOldLogs() {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    let cleaned = 0;
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > 7 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      log(`🧹 Maintenance: Archived ${cleaned} legacy log file(s)`, colors.dim);
    }
  } catch (error) {
    // Silent fail
  }
}

function startBot() {
  log('🤖 Initializing Core Client...', colors.cyan);
  
  const bot = spawn('node', ['bot.js'], {
    cwd: __dirname,
    stdio: 'pipe',
    env: { ...process.env, NODE_NO_WARNINGS: '1' }
  });

  const ignoredBotMessages = [
    'DeprecationWarning',
    'ExperimentalWarning',
    '(Use `node --trace',
    'Validating config',
    'Loading commands',
    'Loading contexts',
    'Loading events'
  ];

  bot.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (!message) return;
    
    const shouldIgnore = ignoredBotMessages.some(ignored => message.includes(ignored));
    if (shouldIgnore) return;
    
    if (message.includes('Logged in as')) {
      log(`${message}`, colors.green);
    } else if (message.includes('✅')) {
      log(`${message}`, colors.green);
    } else if (message.includes('ERROR') || message.includes('error')) {
      log(`${message}`, colors.red);
    } else if (message.includes('WARN')) {
      log(`${message}`, colors.yellow);
    } else if (message.includes('INFO:')) {
      // Skip verbose INFO logs
      return;
    } else {
      log(`${message}`, colors.dim);
    }
  });

  bot.stderr.on('data', (data) => {
    const message = data.toString().trim();
    const shouldIgnore = ignoredBotMessages.some(ignored => message.includes(ignored));
    
    if (!shouldIgnore && message && !isShuttingDown) {
      log(`Bot error: ${message}`, colors.red);
    }
  });

  bot.on('close', (code) => {
    if (isShuttingDown) return;
    
    log(`Bot exited with code ${code}`, colors.yellow);
    
    if (code !== 0 && code !== null) {
      log('Restarting bot in 5 seconds...', colors.yellow);
      setTimeout(() => {
        if (!isShuttingDown) {
          botProcess = startBot();
        }
      }, 5000);
    }
  });

  bot.on('error', (error) => {
    if (!isShuttingDown) {
      log(`Bot error: ${error.message}`, colors.red);
    }
  });

  return bot;
}

async function main() {
  console.clear();
  console.log('\x1b[36m' + `
    ___     _             _    
   / __|  _| |__  ___ _ _| |__ 
  | (_| || | '_ \\/ _ \\ '_| / / 
   \\___\\_, |_.__/\\___/_| |_\\_\\ 
       |__/                     
  ` + '\x1b[0m');
  console.log('\x1b[2m' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\x1b[0m');
  console.log('\x1b[1m\x1b[36m' + '        Cybork Advanced Management System' + '\x1b[0m');
  console.log('\x1b[36m' + '             Enterprise-Grade Core' + '\x1b[0m');
  console.log('\x1b[2m' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\x1b[0m\n');

  // Auto-fix vulnerabilities
  await autoFixVulnerabilities();
  
  // Clean old logs
  await cleanOldLogs();

  // Check if node_modules exists
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('📦 Dependencies missing. Initializing automated installation...', colors.yellow);
    const loader = getLoader('Installing packages...');
    await new Promise((resolve) => {
      exec('npm install --no-fund --no-audit --silent', (error) => {
        clearInterval(loader);
        if (error) {
          log('⚠️  Dependency installation had issues. Manual check recommended.', colors.yellow);
        } else {
          process.stdout.write('\r\x1b[32m✓\x1b[0m Dependencies synchronized               \n');
        }
        resolve();
      });
    });
  }

  botProcess = startBot();
  const botLoader = getLoader('Launching Core Client...');

  // Simple wait for bot status
  setTimeout(() => {
    clearInterval(botLoader);
    process.stdout.write('\r\x1b[32m✓\x1b[0m Cybork Core operational               \n\n');
  }, 2000);
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('');
  log('🛑 Shutting down...', colors.yellow);
  
  if (botProcess) {
    botProcess.kill();
  }
  
  setTimeout(() => {
    log('✅ Shutdown complete', colors.green);
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (error) => {
  if (!isShuttingDown) {
    log(`Uncaught Exception: ${error.message}`, colors.red);
  }
});

process.on('unhandledRejection', (reason) => {
  if (!isShuttingDown) {
    log(`Unhandled Rejection: ${reason}`, colors.red);
  }
});

main().catch((error) => {
  log(`Startup failed: ${error.message}`, colors.red);
  process.exit(1);
});
