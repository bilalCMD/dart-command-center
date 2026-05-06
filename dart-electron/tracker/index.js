const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

let trackingInterval = null;
let mouseCheckInterval = null;
let flushInterval = null;
let activityBuffer = [];
let idleBuffer = [];
let lastMouseX = -1;
let lastMouseY = -1;
let lastActiveTime = Date.now();
let isIdle = false;
let idleStart = null;
let breakWarningShown = false;
let autoBreakTaken = false;

let sessionCookie = global.sessionCookie || null;
let mainWindow = null;
let backendUrl = null;

const IDLE_THRESHOLD = 3 * 60 * 1000;        // 3 min for idle detection
const BREAK_WARNING_THRESHOLD = 15 * 60 * 1000;  // 15 min - show break popup
const AUTO_BREAK_THRESHOLD = 60 * 60 * 1000;     // 1 hour - auto break

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
  } catch (e) {}
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

function getMousePosition() {
  try {
    if (process.platform === 'win32') {
      const pos = execSync(
        `powershell -command "Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; Write-Output ($p.X.ToString() + ',' + $p.Y.ToString())"`,
        { timeout: 1000, encoding: 'utf8' }
      ).trim();
      if (pos) {
        const [x, y] = pos.split(',').map(Number);
        return { x, y };
      }
    }
  } catch (e) {}
  return null;
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

// Auto clock-out function
async function autoClockOut(reason = 'system_lock') {
  console.log(`🔴 Auto clock-out triggered: ${reason}`);
  await flush();
  await sendRequest('/api/clock', { type: 'CLOCK_OUT', note: `Auto: ${reason}` });
}

// Auto break function
async function autoBreak(reason = 'long_idle') {
  console.log(`☕ Auto break started: ${reason}`);
  await sendRequest('/api/clock', { type: 'BREAK_START', note: `Auto: ${reason}` });
  autoBreakTaken = true;
}

// Show notification in app
function notifyApp(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracker-notification', message);
  }
}

// Show clock-in popup when resumed
async function showClockInPrompt() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send('show-clock-in-prompt');
  }
}

// Check current clock status
async function getClockStatus() {
  const res = await sendRequest('/api/clock/today', null, 'GET');
  return res?.data;
}

function checkMouseAndIdle() {
  const pos = getMousePosition();
  const now = Date.now();
  
  if (pos) {
    if (pos.x !== lastMouseX || pos.y !== lastMouseY) {
      lastMouseX = pos.x;
      lastMouseY = pos.y;
      lastActiveTime = now;
    }
  }
  
  const idleTime = now - lastActiveTime;
  
  // Detect idle start
  if (idleTime >= IDLE_THRESHOLD && !isIdle) {
    isIdle = true;
    idleStart = new Date(lastActiveTime + IDLE_THRESHOLD);
    console.log('💤 User went IDLE at', idleStart.toLocaleTimeString());
  }
  
  // Show break warning at 15 min
  if (idleTime >= BREAK_WARNING_THRESHOLD && !breakWarningShown && !autoBreakTaken) {
    breakWarningShown = true;
    notifyApp({ 
      type: 'break_warning', 
      title: 'Take a break?',
      message: `You've been idle for 15 minutes. Click "Take Break" to log a break.`,
    });
    console.log('⚠️ Break warning shown');
  }
  
  // Auto break at 1 hour idle
  if (idleTime >= AUTO_BREAK_THRESHOLD && !autoBreakTaken) {
    autoBreak('1_hour_idle');
  }
  
  // Detect idle end (user came back)
  if (idleTime < IDLE_THRESHOLD && isIdle) {
    isIdle = false;
    breakWarningShown = false;
    const idleTo = new Date();
    const seconds = Math.round((idleTo - idleStart) / 1000);
    if (seconds > 30) {
      idleBuffer.push({ idleFrom: idleStart.toISOString(), idleTo: idleTo.toISOString(), seconds });
      console.log('✅ Idle ended, duration:', seconds, 's');
    }
    idleStart = null;
    autoBreakTaken = false;
  }
}

// Setup power monitoring (laptop sleep/lock detection)
function setupPowerMonitoring(electronApp, powerMonitor) {
  if (!powerMonitor) return;
  
  // System suspend (laptop closed/sleep)
  powerMonitor.on('suspend', async () => {
    console.log('🔌 System SUSPENDED - auto clock-out');
    await autoClockOut('system_sleep');
  });
  
  // System resume (laptop opened)
  powerMonitor.on('resume', async () => {
    console.log('☀️ System RESUMED');
    lastActiveTime = Date.now();
    isIdle = false;
    breakWarningShown = false;
    autoBreakTaken = false;
    setTimeout(() => showClockInPrompt(), 2000);
  });
  
  // Screen lock
  powerMonitor.on('lock-screen', async () => {
    console.log('🔒 Screen LOCKED - auto clock-out');
    await autoClockOut('screen_locked');
  });
  
  // Screen unlock
  powerMonitor.on('unlock-screen', async () => {
    console.log('🔓 Screen UNLOCKED');
    lastActiveTime = Date.now();
    isIdle = false;
    setTimeout(() => showClockInPrompt(), 2000);
  });
  
  // Shutdown
  powerMonitor.on('shutdown', async (e) => {
    console.log('⛔ System SHUTDOWN');
    e.preventDefault();
    await autoClockOut('system_shutdown');
    electronApp.quit();
  });
}

function startTracking(baseUrl, win, electronApp, powerMonitor) {
  console.log('🚀 Tracking started, backend:', baseUrl);
  backendUrl = baseUrl;
  mainWindow = win;
  
  // Setup power events
  if (powerMonitor) setupPowerMonitoring(electronApp, powerMonitor);
  
  // Mouse + idle check every 5s
  mouseCheckInterval = setInterval(() => { checkMouseAndIdle(); }, 5000);
  
  // App tracking every 10s
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
  }, 10000);
  
  // Flush every 60s
  flushInterval = setInterval(() => { flush(); }, 60000);
}

function stopTracking() {
  if (trackingInterval) clearInterval(trackingInterval);
  if (mouseCheckInterval) clearInterval(mouseCheckInterval);
  if (flushInterval) clearInterval(flushInterval);
  console.log('Tracking stopped');
}

module.exports = { startTracking, stopTracking, setSessionCookie };