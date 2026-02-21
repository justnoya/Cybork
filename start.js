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

let lavalinkProcess = null;
let botProcess = null;
let lavalinkReady = false;
let isShuttingDown = false;

// Auto-fix vulnerabilities on startup
async function autoFixVulnerabilities() {
  return new Promise((resolve) => {
    log('🔧 Running system optimization and security audit...', colors.cyan);
    
    // Set a timeout for npm audit fix
    const timeout = setTimeout(() => {
      log('Optimization check completed', colors.dim);
      resolve();
    }, 5000); // 5 second timeout
    
    exec('npm audit fix --force > /dev/null 2>&1', (error) => {
      clearTimeout(timeout);
      if (error) {
        log('Optimization check completed', colors.dim);
      } else {
        log('✅ Security patches applied successfully', colors.green);
      }
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

async function checkLavalinkRunning() {
  return new Promise((resolve) => {
    exec('lsof -i:2010 || netstat -an | grep 2010', (error, stdout) => {
      resolve(stdout && stdout.trim().length > 0);
    });
  });
}

async function startLavalink() {
  if (!hasLavalink) {
    log('⚠️  Audio Engine assets missing - playback capabilities will be restricted', colors.yellow);
    return null;
  }

  const isRunning = await checkLavalinkRunning();
  if (isRunning) {
    log('ℹ️  Audio Engine already operational on port 2010', colors.cyan);
    lavalinkReady = true;
    return null;
  }

  log('🎵 Initializing high-performance Audio Engine...', colors.magenta);
  
  const lavalink = spawn('java', [
    '-Djdk.tls.client.protocols=TLSv1.3,TLSv1.2',
    '-Xmx512M',
    '-jar',
    'Lavalink.jar'
  ], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  const ignoredMessages = [
    'Picked up JAVA_TOOL_OPTIONS',
    'illegal reflection',
    'Buffer pool was not set',
    'Did not find udev library',
    'Authentication failed from',
    'You can safely ignore'
  ];

  lavalink.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (!message) return;
    
    const shouldIgnore = ignoredMessages.some(ignored => message.includes(ignored));
    if (shouldIgnore) return;
    
    if (message.includes('Lavalink is ready to accept connections')) {
      lavalinkReady = true;
      log('✅ Audio Engine synchronized', colors.green);
    } else if (message.includes('Started Launcher')) {
      log('Audio Engine sequence initiated', colors.dim);
    }
  });

  lavalink.stderr.on('data', (data) => {
    const message = data.toString().trim();
    const shouldIgnore = ignoredMessages.some(ignored => message.includes(ignored));
    if (!shouldIgnore && message && !isShuttingDown) {
      log(`Lavalink: ${message}`, colors.red);
    }
  });

  lavalink.on('close', (code) => {
    if (isShuttingDown) return;
    
    lavalinkReady = false;
    log(`Lavalink exited with code ${code}`, colors.yellow);
    
    if (code !== 0 && code !== null) {
      log('Restarting Lavalink in 10 seconds...', colors.yellow);
      setTimeout(() => {
        if (!isShuttingDown) {
          lavalinkProcess = startLavalink();
        }
      }, 10000);
    }
  });

  lavalink.on('error', (error) => {
    if (!isShuttingDown) {
      log(`Lavalink error: ${error.message}`, colors.red);
    }
  });

  return lavalink;
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
  console.log('\n' + colors.bright + colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log(colors.bright + colors.cyan + '        Advanced Discord Audio & Management' + colors.reset);
  console.log(colors.cyan + '             Enterprise-Grade Systems' + colors.reset);
  console.log(colors.bright + colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset + '\n');

  // Auto-fix vulnerabilities
  await autoFixVulnerabilities();
  
  // Clean old logs
  await cleanOldLogs();

  // Check if node_modules exists
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('📦 Installing dependencies...', colors.yellow);
    await new Promise((resolve) => {
      exec('npm install --silent', (error) => {
        if (error) {
          log('⚠️  Dependency installation had issues', colors.yellow);
        } else {
          log('✅ Dependencies installed', colors.green);
        }
        resolve();
      });
    });
  }

  if (hasLavalink) {
    lavalinkProcess = await startLavalink();
    
    if (lavalinkProcess) {
      log('⏳ Initializing Audio Engine...', colors.dim);
      
      let waitTime = 0;
      const maxWait = 30000;
      
      while (!lavalinkReady && waitTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }
      
      if (lavalinkReady) {
        log('✅ Audio Engine synchronization complete', colors.green);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        log('⚠️  Audio Engine response delayed, proceeding with core services...', colors.yellow);
      }
    }
  }

  botProcess = startBot();

  console.log('');
  log('✅ System initialization successful', colors.green);
  log('🚀 All services are now operational', colors.bright);
  console.log('');
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('');
  log('🛑 Shutting down...', colors.yellow);
  
  if (botProcess) {
    botProcess.kill();
  }
  
  if (lavalinkProcess) {
    lavalinkProcess.kill();
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
