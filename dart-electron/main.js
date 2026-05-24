const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session, powerMonitor, Notification } = require('electron');
const path = require('path');
const https = require('https');
const { autoUpdater } = require('electron-updater');
const { startTracking, stopTracking, setSessionCookie } = require('./tracker/index');

let mainWindow;
let popupWindow;
let tray;
let currentCookie = null;
let isLoggedIn = false;
const BASE_URL = 'https://portal.dartwebsite.com';

// 🔒 Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('⚠️ Another instance is already running. Quitting.');
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// 🔄 Auto-updater setup
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  console.log('📥 Update available:', info.version);
  injectUpdateButton('available');
  if (Notification.isSupported()) {
    new Notification({
      title: '🔄 Update Available',
      body: `New version ${info.version} is downloading in background...`,
      silent: true,
    }).show();
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Update downloaded:', info.version);
  showUpdatePopup(info.version);
  if (Notification.isSupported()) {
    new Notification({
      title: '✅ Update Ready!',
      body: `Click "Install Now" in app to update to v${info.version}`,
      silent: false,
    }).show();
  }
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err.message);
  injectUpdateButton('error');
});

autoUpdater.on('update-not-available', () => {
  console.log('✅ App is up to date');
  injectUpdateButton('latest');
});

let updateState = 'checking'; // 'latest' | 'available' | 'checking' | 'error'

function injectUpdateButton(state) {
  updateState = state;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const version = app.getVersion();
  mainWindow.webContents.executeJavaScript(`
    (function() {
      let btn = document.getElementById('dart-update-btn');
      if (!btn) {
        btn = document.createElement('div');
        btn.id = 'dart-update-btn';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:99px;font-family:-apple-system,Segoe UI,sans-serif;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:all 0.2s;user-select:none;';
        document.body.appendChild(btn);
      }
      const state = '${state}';
      const version = 'v${version}';
      if (state === 'available') {
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
        btn.innerHTML = '🔴 Update Available — Click to Install';
        btn.onclick = function() {
          btn.innerHTML = '⏳ Installing...';
          window.dartInstallUpdate && window.dartInstallUpdate();
        };
      } else if (state === 'latest') {
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        btn.innerHTML = '🟢 Up to date (' + version + ')';
        btn.onclick = null;
      } else if (state === 'checking') {
        btn.style.background = '#94a3b8';
        btn.style.color = '#fff';
        btn.innerHTML = '⏳ Checking for updates...';
      } else {
        btn.style.background = '#f59e0b';
        btn.style.color = '#fff';
        btn.innerHTML = '⚠️ Update check failed (' + version + ')';
      }
    })();
  `).catch(() => { });
}

// 🎨 Beautiful Update Popup
function showUpdatePopup(version) {
  const updateWindow = new BrowserWindow({
    width: 420,
    height: 360,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    frame: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: 'Dart - Update Available',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    overflow: hidden;
    user-select: none;
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .drag { -webkit-app-region: drag; position: absolute; top: 0; left: 0; right: 0; height: 40px; z-index: 1; }
  .close-btn {
    position: absolute; top: 10px; right: 10px;
    background: rgba(255,255,255,0.2); border: none; color: white;
    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
    font-size: 16px; z-index: 2;
    -webkit-app-region: no-drag;
  }
  .header { padding: 30px 24px 16px; text-align: center; color: white; }
  .icon { font-size: 48px; margin-bottom: 8px; animation: bounce 2s infinite; }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  .title { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
  .subtitle { font-size: 13px; opacity: 0.9; }
  .body { background: white; flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; }
  .version-box { background: linear-gradient(135deg, #f3e8ff, #e0e7ff); padding: 14px; border-radius: 12px; text-align: center; margin-bottom: 16px; }
  .version-label { font-size: 10px; color: #667eea; font-weight: 700; letter-spacing: 1px; }
  .version-num { font-size: 24px; font-weight: 900; color: #4c1d95; margin-top: 2px; }
  .features { font-size: 12px; color: #555; margin-bottom: 16px; line-height: 1.6; }
  .features .check { color: #22c55e; font-weight: 700; }
  .btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 8px; transition: all 0.2s; }
  .btn-install { background: linear-gradient(135deg, #667eea, #764ba2); color: white; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); }
  .btn-install:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5); }
  .btn-later { background: #f5f5f5; color: #666; font-size: 12px; padding: 10px; }
</style>
</head>
<body>
<div class="drag"></div>
<button class="close-btn" onclick="closeWindow()">×</button>
<div class="header">
  <div class="icon">🎉</div>
  <div class="title">Update Available!</div>
  <div class="subtitle">A new version of Dart Command Center is ready</div>
</div>
<div class="body">
  <div>
    <div class="version-box">
      <div class="version-label">NEW VERSION</div>
      <div class="version-num">v${version}</div>
    </div>
    <div class="features">
      <div><span class="check">✓</span> Auto clock-out when laptop closes</div>
      <div><span class="check">✓</span> Bug fixes & improvements</div>
      <div><span class="check">✓</span> Performance enhancements</div>
    </div>
  </div>
  <div>
    <button class="btn btn-install" onclick="installNow()">⚡ Install & Restart Now</button>
    <button class="btn btn-later" onclick="closeWindow()">Remind me later</button>
  </div>
</div>
<script>
  const { ipcRenderer } = require('electron');
  function installNow() {
    document.querySelector('.btn-install').textContent = '⏳ Installing...';
    document.querySelector('.btn-install').style.background = '#22c55e';
    ipcRenderer.send('install-update-now');
  }
  function closeWindow() { ipcRenderer.send('close-update-window'); }
</script>
</body>
</html>`;

  updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  global.updateWindow = updateWindow;
}

async function captureCookies() {
  try {
    const cookies = await session.defaultSession.cookies.get({ url: BASE_URL });
    const sessionCookie = cookies.find(c =>
      c.name === 'next-auth.session-token' ||
      c.name === '__Secure-next-auth.session-token'
    );
    if (sessionCookie) {
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      currentCookie = cookieStr;
      setSessionCookie(cookieStr);
      isLoggedIn = true;
      console.log('✅ Cookie captured!', sessionCookie.name);
      return true;
    }
    isLoggedIn = false;
    return false;
  } catch (e) {
    console.error('Cookie error:', e);
    return false;
  }
}

function clockRequest(type, note) {
  return new Promise((resolve) => {
    if (!currentCookie) return resolve(null);
    try {
      const body = JSON.stringify({ type, note });
      const req = https.request({
        hostname: 'portal.dartwebsite.com',
        port: 443,
        path: '/api/clock',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Cookie': currentCookie,
        },
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          console.log(`Clock ${type} status:`, res.statusCode);
          resolve(res.statusCode);
        });
      });
      req.on('error', e => { console.error('Clock error:', e.message); resolve(null); });
      req.write(body);
      req.end();
    } catch (e) { resolve(null); }
  });
}

// 🔥 AUTO CLOCK-OUT function
async function autoClockOut(reason) {
  try {
    // Pehle current status check karo - agar break/away mein hai to clock out MAT karo
    const statusRes = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'portal.dartwebsite.com',
        port: 443,
        path: '/api/clock/today',
        method: 'GET',
        headers: { 'Cookie': currentCookie },
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });

    // Agar break ya away mein hai, to clock out skip karo (user wapas aayega)
    if (statusRes && (statusRes.isOnBreak || statusRes.isAway)) {
      console.log(`⏸️ Skip auto clock-out: user is on break/away (${reason})`);
      return null;
    }

    // Agar already clocked out hai, to kuch mat karo
    if (statusRes && !statusRes.isClockedIn) {
      console.log(`⏸️ Skip auto clock-out: already clocked out`);
      return null;
    }

    console.log(`🔌 Auto clock-out triggered: ${reason}`);
    const status = await clockRequest('CLOCK_OUT', `Auto - ${reason}`);
    console.log(`Auto clock-out result: ${status}`);
    return status;
  } catch (err) {
    console.error('Auto clock-out error:', err);
    return null;
  }
}

function showClockInPopup() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.focus();
    return;
  }

  popupWindow = new BrowserWindow({
    width: 340,
    height: 280,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    frame: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: 'Dart - Clock In',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    user-select: none;
  }
  .header { background: linear-gradient(135deg, #ff6b35, #f7c59f); padding: 20px; text-align: center; color: white; }
  .logo { font-size: 28px; margin-bottom: 4px; }
  .title { font-size: 16px; font-weight: 700; }
  .sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }
  .body { padding: 20px; }
  .time { text-align: center; font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
  .date { text-align: center; font-size: 12px; color: #888; margin-bottom: 16px; }
  .btn { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 8px; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.85; }
  .btn-clock { background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; }
  .btn-skip { background: #f5f5f5; color: #666; font-size: 12px; padding: 8px; }
  .drag { -webkit-app-region: drag; position: absolute; top: 0; left: 0; right: 0; height: 40px; }
</style>
</head>
<body>
<div class="drag"></div>
<div class="header">
  <img src="https://portal.dartwebsite.com/logo-new.png" style="width:40px;height:40px;object-fit:contain;" />
  <div class="title">Dart Command Center</div>
  <div class="sub">Good morning! Ready to start?</div>
</div>
<div class="body">
  <div class="time" id="time">00:00:00</div>
  <div class="date" id="date"></div>
  <button class="btn btn-clock" onclick="clockIn()">✅ Clock In</button>
  <button class="btn btn-skip" onclick="skip()">Skip for now</button>
</div>
<script>
  const { ipcRenderer } = require('electron');
  function updateTime() {
    const now = new Date();
    document.getElementById('time').textContent = now.toLocaleTimeString('en-US', { hour12: true });
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  updateTime();
  setInterval(updateTime, 1000);
  function clockIn() { ipcRenderer.send('popup-clock-in'); }
  function skip() { ipcRenderer.send('popup-skip'); }
  ipcRenderer.on('clock-success', () => {
    document.querySelector('.btn-clock').textContent = '✅ Clocked In!';
    document.querySelector('.btn-clock').style.background = '#22c55e';
    setTimeout(() => ipcRenderer.send('popup-skip'), 1500);
  });
</script>
</body>
</html>`;

  popupWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  popupWindow.on('closed', () => { popupWindow = null; });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'logo-new.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
    title: 'Dart Command Center',
    show: false,
  });

  mainWindow.loadURL(BASE_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-navigate', async () => {
    await captureCookies();
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    await captureCookies();
    // Inject floating update button + install bridge
    mainWindow.webContents.executeJavaScript(`
      window.dartInstallUpdate = function() {
        window.location.href = 'dart-install-update://now';
      };
    `).catch(() => { });
    injectUpdateButton(updateState);
    // Trigger a check
    autoUpdater.checkForUpdates().catch(() => { });
  });
  // Intercept update install trigger from floating button
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('dart-install-update://')) {
      e.preventDefault();
      console.log('🚀 Installing update from floating button...');
      autoUpdater.quitAndInstall();
    }
  });
  session.defaultSession.cookies.on('changed', async (event, cookie, cause, removed) => {
    if (!removed && (
      cookie.name === 'next-auth.session-token' ||
      cookie.name === '__Secure-next-auth.session-token'
    )) {
      setTimeout(async () => { await captureCookies(); }, 500);
    }
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
    if (Notification.isSupported()) {
      new Notification({
        title: 'Dart still running',
        body: 'App is minimized to tray. Use tray icon to quit.',
        silent: true,
      }).show();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'logo-new.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open Dart', click: () => mainWindow.show() },
    { label: 'Clock In', click: () => clockRequest('CLOCK_IN', 'Manual - tray') },
    { label: 'Clock Out', click: () => clockRequest('CLOCK_OUT', 'Manual - tray') },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => autoUpdater.checkForUpdates() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.exit(0); } },
  ]);
  tray.setToolTip('Dart Command Center');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow.show());
}

app.commandLine.appendSwitch('disk-cache-size', '104857600');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    name: 'Dart Command Center',
  });

  createMainWindow();
  createTray();

  // 🔄 Check for updates on startup (after 30 sec)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 30000);

  // 🔄 Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);

  // Wait for cookie before starting tracker
  let trackerStarted = false;
  const tryStartTracker = setInterval(async () => {
    const hasCookie = await captureCookies();
    if (hasCookie && !trackerStarted) {
      trackerStarted = true;
      clearInterval(tryStartTracker);
      console.log('✅ Cookie ready, starting tracker...');
      startTracking(BASE_URL, mainWindow, app, powerMonitor);
    }
  }, 3000);

  // Cookie refresh every 5 min
  setInterval(async () => {
    const refreshed = await captureCookies();
    if (refreshed) {
      console.log('🔄 Cookie refreshed at', new Date().toLocaleTimeString());
    }
  }, 5 * 60 * 1000);

  // Fallback - start anyway after 30s
  setTimeout(() => {
    if (!trackerStarted) {
      trackerStarted = true;
      clearInterval(tryStartTracker);
      console.log('⚠️ Starting tracker without cookie (fallback)');
      startTracking(BASE_URL, mainWindow, app, powerMonitor);
    }
  }, 30000);

  // 🔥 AUTO CLOCK-OUT: Laptop shutdown
  powerMonitor.on('shutdown', async (e) => {
    console.log('⛔ System shutdown - AUTO CLOCK OUT');
    if (isLoggedIn) {
      await autoClockOut('laptop shutdown');
    }
  });

  // 🔥 AUTO CLOCK-OUT: Laptop close / sleep
  powerMonitor.on('suspend', async () => {
    console.log('💤 System suspended - AUTO CLOCK OUT');
    if (isLoggedIn) {
      await autoClockOut('laptop closed/sleep');
    }
  });

  // Screen lock - sirf log, NO auto clock-out (break/namaz ke liye lock karte hain)
  powerMonitor.on('lock-screen', async () => {
    console.log('🔒 Screen locked - no auto clock-out (might be break/namaz)');
  });

  // ☀️ System resumed - show clock in popup
  powerMonitor.on('resume', async () => {
    console.log('☀️ System resumed');
    if (isLoggedIn) {
      showClockInPopup();
    }
  }, 3000);
});

// 🔓 Screen unlocked - show clock in popup
powerMonitor.on('unlock-screen', async () => {
  console.log('🔓 Screen unlocked');
  setTimeout(async () => {
    if (isLoggedIn) {
      showClockInPopup();
    }
  }, 2000);
});

// 4 hour work reminder (notification only)
let fourHourReminderShown = false;
setInterval(async () => {
  if (!isLoggedIn || !currentCookie) return;
  try {
    const res = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'portal.dartwebsite.com',
        port: 443,
        path: '/api/clock/today',
        method: 'GET',
        headers: { 'Cookie': currentCookie },
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });

    if (!res) return;
    const isClockedIn = res.isClockedIn;
    const workingSeconds = res.workingSeconds || 0;

    if (isClockedIn && workingSeconds >= 4 * 3600 && !fourHourReminderShown) {
      fourHourReminderShown = true;
      if (Notification.isSupported()) {
        new Notification({
          title: '💪 Great work!',
          body: `You've been working for 4 hours! Take a short break if needed.`,
          silent: false,
        }).show();
      }
    }

    if (!isClockedIn) {
      fourHourReminderShown = false;
    }

    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isWorkingDay = day >= 1 && day <= 5;
    const isWorkingHours = hour >= 9 && hour <= 18;

    if (!isClockedIn && isWorkingDay && isWorkingHours) {
      showClockInPopup();
    }
  } catch (e) {
    console.error('Status check error:', e);
  }
}, 60 * 60 * 1000);
});

// 🔥 AUTO CLOCK-OUT: App quit (user closes app from tray)
app.on('before-quit', async (e) => {
  if (!app.isQuitting && isLoggedIn) {
    e.preventDefault();
    app.isQuitting = true;
    console.log('🚪 App quitting - AUTO CLOCK OUT');
    await autoClockOut('app closed by user');
    setTimeout(() => app.exit(0), 1000);
  }
});

app.on('window-all-closed', (e) => { e.preventDefault(); });

// IPC Handlers
ipcMain.on('popup-clock-in', async () => {
  const status = await clockRequest('CLOCK_IN', 'Manual - popup');
  if (popupWindow && !popupWindow.isDestroyed()) {
    if (status === 200 || status === 400) {
      popupWindow.webContents.send('clock-success');
    } else {
      setTimeout(async () => {
        await clockRequest('CLOCK_IN', 'Manual - popup retry');
        if (popupWindow && !popupWindow.isDestroyed()) {
          popupWindow.webContents.send('clock-success');
        }
      }, 2000);
    }
  }
});

ipcMain.on('popup-skip', () => {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
  }
});

ipcMain.on('show-notification', (_, msg) => {
  if (Notification.isSupported()) {
    new Notification({
      title: msg.title || 'Dart Command Center',
      body: msg.message,
      silent: false
    }).show();
  }
});
// 🔔 "Are you still working?" popup
let stillWorkingWindow = null;

function showStillWorkingPopup() {
  if (stillWorkingWindow && !stillWorkingWindow.isDestroyed()) {
    stillWorkingWindow.focus();
    return;
  }

  stillWorkingWindow = new BrowserWindow({
    width: 380,
    height: 280,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    frame: false,
    skipTaskbar: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'Dart - Are you working?',
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #fff; border-radius: 16px; overflow: hidden; user-select: none; height: 100vh; }
  .header { background: linear-gradient(135deg, #f59e0b, #f97316); padding: 24px; text-align: center; color: white; }
  .icon { font-size: 40px; margin-bottom: 8px; }
  .title { font-size: 18px; font-weight: 800; }
  .body { padding: 24px; text-align: center; }
  .msg { font-size: 13px; color: #555; margin-bottom: 8px; line-height: 1.5; }
  .timer { font-size: 12px; color: #f97316; font-weight: 700; margin-bottom: 18px; }
  .btn { width: 100%; padding: 13px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 8px; }
  .btn-yes { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
  .btn-no { background: #f5f5f5; color: #666; font-size: 12px; padding: 10px; }
  .drag { -webkit-app-region: drag; position: absolute; top: 0; left: 0; right: 0; height: 30px; }
</style>
</head>
<body>
<div class="drag"></div>
<div class="header">
  <div class="icon">👀</div>
  <div class="title">Are you still working?</div>
</div>
<div class="body">
  <div class="msg">We noticed you've been inactive for a while.</div>
  <div class="timer">Auto clock-out in <span id="countdown">300</span>s</div>
  <button class="btn btn-yes" onclick="stillWorking()">✅ Yes, I'm working</button>
  <button class="btn btn-no" onclick="clockOut()">Clock me out</button>
</div>
<script>
  const { ipcRenderer } = require('electron');
  let secs = 300;
  const timer = setInterval(() => {
    secs--;
    document.getElementById('countdown').textContent = secs;
    if (secs <= 0) { clearInterval(timer); ipcRenderer.send('still-working-timeout'); }
  }, 1000);
  function stillWorking() { clearInterval(timer); ipcRenderer.send('still-working-yes'); }
  function clockOut() { clearInterval(timer); ipcRenderer.send('still-working-no'); }
</script>
</body>
</html>`;

  stillWorkingWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  stillWorkingWindow.on('closed', () => { stillWorkingWindow = null; });
}

// Tracker se "still working check" signal
ipcMain.on('tracker-notification', (_, msg) => {
  if (msg.type === 'still_working_check' && isLoggedIn) {
    showStillWorkingPopup();
  }
});

// User: "Yes I'm working"
ipcMain.on('still-working-yes', () => {
  console.log('✅ User confirmed working');
  if (stillWorkingWindow && !stillWorkingWindow.isDestroyed()) stillWorkingWindow.close();
});

// User: "Clock me out" OR timeout
ipcMain.on('still-working-no', async () => {
  console.log('🔴 User chose clock out');
  if (stillWorkingWindow && !stillWorkingWindow.isDestroyed()) stillWorkingWindow.close();
  await clockRequest('CLOCK_OUT', 'Auto - idle (user confirmed away)');
});

ipcMain.on('still-working-timeout', async () => {
  console.log('⏰ Still working timeout - auto clock out');
  if (stillWorkingWindow && !stillWorkingWindow.isDestroyed()) stillWorkingWindow.close();
  await clockRequest('CLOCK_OUT', 'Auto - idle timeout (no response)');
});
ipcMain.on('show-clock-in-prompt', () => {
  showClockInPopup();
});

// Install update handler
ipcMain.on('install-update-now', () => {
  console.log('🚀 Installing update...');
  autoUpdater.quitAndInstall();
});

// Close update window handler
ipcMain.on('close-update-window', () => {
  if (global.updateWindow && !global.updateWindow.isDestroyed()) {
    global.updateWindow.close();
  }
});