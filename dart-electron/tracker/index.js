const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

let trackingInterval = null;
let mouseCheckInterval = null;
let flushInterval = null;
let activityBuffer = [];
let idleBuffer = [];
let lastActiveTime = Date.now();
let isIdle = false;
let idleStart = null;
let breakWarningShown = false;
let stillWorkingAsked = false;
let sessionCookie = null;
let mainWindow = null;
let backendUrl = null;
let electronPowerMonitor = null; // set via startTracking, used for getSystemIdleTime()

const IDLE_THRESHOLD = 15 * 60 * 1000;           // 15 min
const BREAK_WARNING_THRESHOLD = 90 * 60 * 1000;  // 90 min - notification only

function setSessionCookie(cookie) {
  sessionCookie = cookie;
  console.log('Session cookie set:', cookie ? 'YES' : 'NO');
}

function getActiveWindowInfo() {
  try {
    if (process.platform === 'win32') {
      const result = execSync(
        `powershell -NoProfile -NonInteractive -command "try { $hwnd = Add-Type -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);' -Name U32 -Namespace W -PassThru; $h = [W.U32]::GetForegroundWindow(); $p = [uint32]0; [W.U32]::GetWindowThreadProcessId($h, [ref]$p) | Out-Null; $proc = Get-Process -Id $p -EA Stop; Write-Output ($proc.ProcessName + '||' + $proc.MainWindowTitle) } catch { Write-Output 'Unknown||Unknown' }"`,
        { timeout: 4000, encoding: 'utf8' }
      ).trim();
      if (result && result.includes('||')) {
        const idx = result.indexOf('||');
        return { procName: result.substring(0, idx).trim(), title: result.substring(idx + 2).trim() };
      }
    }
  } catch (e) { }
  return { procName: 'Unknown', title: 'Unknown' };
}

function extractSiteFromTitle(windowTitle) {
  if (!windowTitle) return null;
  const chromePatterns = [' - Google Chrome', ' - Chrome', ' - Brave', ' - Microsoft Edge', ' - Firefox'];
  for (const pattern of chromePatterns) {
    if (windowTitle.includes(pattern)) {
      const titlePart = windowTitle.replace(pattern, '').trim();
      const siteMappings = [
        { keywords: ['youtube'], domain: 'youtube.com' },
        { keywords: ['gmail', 'google mail', 'inbox'], domain: 'gmail.com' },
        { keywords: ['google meet'], domain: 'meet.google.com' },
        { keywords: ['google drive'], domain: 'drive.google.com' },
        { keywords: ['google docs'], domain: 'docs.google.com' },
        { keywords: ['google sheets'], domain: 'sheets.google.com' },
        { keywords: ['facebook'], domain: 'facebook.com' },
        { keywords: ['instagram'], domain: 'instagram.com' },
        { keywords: ['twitter', ' x '], domain: 'twitter.com' },
        { keywords: ['linkedin'], domain: 'linkedin.com' },
        { keywords: ['whatsapp'], domain: 'web.whatsapp.com' },
        { keywords: ['notion'], domain: 'notion.so' },
        { keywords: ['figma'], domain: 'figma.com' },
        { keywords: ['github'], domain: 'github.com' },
        { keywords: ['chatgpt'], domain: 'chatgpt.com' },
        { keywords: ['claude'], domain: 'claude.ai' },
        { keywords: ['netflix'], domain: 'netflix.com' },
        { keywords: ['spotify'], domain: 'spotify.com' },
        { keywords: ['zoom'], domain: 'zoom.us' },
        { keywords: ['slack'], domain: 'slack.com' },
        { keywords: ['canva'], domain: 'canva.com' },
        { keywords: ['reddit'], domain: 'reddit.com' },
        { keywords: ['tiktok'], domain: 'tiktok.com' },
        { keywords: ['discord'], domain: 'discord.com' },
        { keywords: ['trello'], domain: 'trello.com' },
        { keywords: ['asana'], domain: 'asana.com' },
        { keywords: ['localhost'], domain: 'localhost' },
        { keywords: ['dart command center'], domain: 'dartmarketing.io' },
      ];
      const lower = titlePart.toLowerCase();
      for (const mapping of siteMappings) {
        for (const keyword of mapping.keywords) {
          if (lower.includes(keyword)) return mapping.domain;
        }
      }
      const parts = titlePart.split(' - ');
      return parts[parts.length - 1].trim().substring(0, 50);
    }
  }
  return null;
}

function getAppName(procName, windowTitle) {
  if (!procName || procName === 'Unknown') return 'Unknown';
  const lower = procName.toLowerCase();
  if (lower.includes('chrome')) return 'Google Chrome';
  if (lower.includes('firefox')) return 'Firefox';
  if (lower.includes('msedge')) return 'Microsoft Edge';
  if (lower.includes('brave')) return 'Brave';
  if (lower === 'applicationframehost') {
    if (!windowTitle || windowTitle === 'Unknown') return 'Windows App';
    return windowTitle.split(' - ')[0].trim() || 'Windows App';
  }
  const knownApps = {
    'discord': 'Discord', 'claude': 'Claude', 'ms-teams': 'Microsoft Teams',
    'teams': 'Microsoft Teams', 'whatsapp.root': 'WhatsApp', 'whatsapp': 'WhatsApp',
    'slack': 'Slack', 'zoom': 'Zoom', 'code': 'VS Code', 'figma': 'Figma',
    'photoshop': 'Photoshop', 'illustrator': 'Illustrator', 'excel': 'Microsoft Excel',
    'winword': 'Microsoft Word', 'powerpnt': 'PowerPoint', 'spotify': 'Spotify',
    'telegram': 'Telegram', 'postman': 'Postman', 'explorer': 'File Explorer',
    'snippingtool': 'Snipping Tool', 'notepad': 'Notepad', 'windowsterminal': 'Terminal',
    'cmd': 'CMD', 'powershell': 'PowerShell',
  };
  if (knownApps[lower]) return knownApps[lower];
  for (const [key, val] of Object.entries(knownApps)) {
    if (lower.includes(key)) return val;
  }
  const cleaned = procName.replace(/\.exe$/i, '').replace(/([A-Z])/g, ' $1').replace(/[-_.]/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}


function sendRequest(path, data, method = 'POST') {
  return new Promise((resolve) => {
    try {
      const url = new URL(path, backendUrl);
      const body = method === 'GET' ? null : JSON.stringify(data);
      const lib = url.protocol === 'https:' ? https : http;
      const headers = { 'Content-Type': 'application/json' };
      if (body) headers['Content-Length'] = Buffer.byteLength(body);
      if (sessionCookie) headers['Cookie'] = sessionCookie;
      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method, headers,
      }, (res) => {
        let resBody = '';
        res.on('data', d => resBody += d);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(resBody) }); }
          catch { resolve({ status: res.statusCode, data: resBody }); }
        });
      });
      req.on('error', () => resolve(null));
      if (body) req.write(body);
      req.end();
    } catch (e) { resolve(null); }
  });
}

async function flush() {
  if (activityBuffer.length === 0 && idleBuffer.length === 0) return;
  const merged = {};
  for (const item of activityBuffer) {
    const key = `${item.appName}||${item.site || ''}`;
    if (!merged[key]) merged[key] = { appName: item.appName, site: item.site || null, seconds: 0 };
    merged[key].seconds += item.seconds;
  }
  await sendRequest('/api/activity/log', {
    activities: Object.values(merged),
    idleLogs: idleBuffer,
    date: new Date().toISOString(),
  });
  activityBuffer = [];
  idleBuffer = [];
}

// 🔒 REMOVED: autoClockOut, autoBreak functions
// Only manual user actions trigger clock events now

function notifyApp(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracker-notification', message);
  }
}

function checkMouseAndIdle() {
  const now = Date.now();

  // Use Electron's native system idle time — reliable, no PowerShell needed
  // getSystemIdleTime() returns seconds since last keyboard/mouse input
  let idleTime;
  if (electronPowerMonitor) {
    const sysIdleSecs = electronPowerMonitor.getSystemIdleTime();
    idleTime = sysIdleSecs * 1000;
    if (idleTime < IDLE_THRESHOLD) {
      lastActiveTime = now;
    }
  } else {
    idleTime = now - lastActiveTime;
  }

  if (idleTime >= IDLE_THRESHOLD && !isIdle) {
    isIdle = true;
    idleStart = new Date(now - idleTime + IDLE_THRESHOLD);
    console.log('💤 IDLE detected at', idleStart.toLocaleTimeString(), `(${Math.round(idleTime/60000)}min idle)`);
  }

  const STILL_WORKING_THRESHOLD = 30 * 60 * 1000;
  if (idleTime >= STILL_WORKING_THRESHOLD && !stillWorkingAsked) {
    stillWorkingAsked = true;
    notifyApp({ type: 'still_working_check' });
    console.log('🔔 Asking: Are you still working?');
  }
  if (idleTime < IDLE_THRESHOLD) {
    stillWorkingAsked = false;
  }

  if (idleTime >= BREAK_WARNING_THRESHOLD && !breakWarningShown) {
    breakWarningShown = true;
    notifyApp({
      type: 'break_warning',
      title: 'Time for a break?',
      message: `You've been idle for 90 minutes. Consider taking a break.`,
    });
  }

  if (idleTime < IDLE_THRESHOLD && isIdle) {
    isIdle = false;
    breakWarningShown = false;
    const idleTo = new Date();
    const seconds = Math.round((idleTo - idleStart) / 1000);
    if (seconds > 30 && seconds < 4 * 60 * 60) {
      idleBuffer.push({
        idleFrom: idleStart.toISOString(),
        idleTo: idleTo.toISOString(),
        seconds,
      });
      console.log(`📝 Idle logged: ${Math.round(seconds/60)}min (${idleStart.toLocaleTimeString()} → ${idleTo.toLocaleTimeString()})`);
    }
    idleStart = null;
    lastActiveTime = now;
  }
}


// 🔒 SIMPLIFIED Power monitoring - no auto-actions
function setupPowerMonitoring(electronApp, powerMonitor) {
  if (!powerMonitor) return;

  powerMonitor.on('suspend', async () => {
    console.log('🔌 SUSPENDED - flushing data (no auto clock-out)');
    await flush();
  });

  powerMonitor.on('resume', async () => {
    console.log('☀️ RESUMED');
    lastActiveTime = Date.now();
    isIdle = false;
    breakWarningShown = false;
  });

  powerMonitor.on('lock-screen', async () => {
    console.log('🔒 LOCKED - no auto-action');
  });

  powerMonitor.on('unlock-screen', async () => {
    console.log('🔓 UNLOCKED');
    lastActiveTime = Date.now();
    isIdle = false;
  });

  powerMonitor.on('shutdown', async (e) => {
    console.log('⛔ SHUTDOWN - flushing data (no auto clock-out)');
    await flush();
    electronApp.quit();
  });
}

function startTracking(baseUrl, win, electronApp, powerMonitor) {
  console.log('🚀 Tracking started:', baseUrl);
  backendUrl = baseUrl;
  mainWindow = win;
  if (powerMonitor) {
    electronPowerMonitor = powerMonitor;
    setupPowerMonitoring(electronApp, powerMonitor);
  }
  mouseCheckInterval = setInterval(() => { checkMouseAndIdle(); }, 20000);
  trackingInterval = setInterval(() => {
    if (isIdle) return;
    const { procName, title } = getActiveWindowInfo();
    const appName = getAppName(procName, title);
    if (appName && appName !== 'Unknown') {
      const isBrowser = ['Google Chrome', 'Firefox', 'Microsoft Edge', 'Brave'].includes(appName);
      if (isBrowser) {
        const site = extractSiteFromTitle(title);
        activityBuffer.push({ appName, site: site || null, seconds: 10 });
      } else {
        activityBuffer.push({ appName, site: null, seconds: 10 });
      }
    }
  }, 20000);
  flushInterval = setInterval(() => { flush(); }, 120000);
}

function stopTracking() {
  if (trackingInterval) clearInterval(trackingInterval);
  if (mouseCheckInterval) clearInterval(mouseCheckInterval);
  if (flushInterval) clearInterval(flushInterval);
  console.log('Tracking stopped');
}

module.exports = { startTracking, stopTracking, setSessionCookie };