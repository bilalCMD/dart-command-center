const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session, powerMonitor } = require('electron');
const path = require('path');
const http = require('http');
const { startTracking, stopTracking, setSessionCookie } = require('./tracker/index');

let mainWindow;
let popupWindow;
let tray;
let currentCookie = null;
let isLoggedIn = false;
const BASE_URL = 'http://localhost:3000';

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
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
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
          console.log(`Auto ${type} status:`, res.statusCode);
          resolve(res.statusCode);
        });
      });
      req.on('error', e => { console.error('Clock error:', e.message); resolve(null); });
      req.write(body);
      req.end();
    } catch (e) { resolve(null); }
  });
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
  .header {
    background: linear-gradient(135deg, #ff6b35, #f7c59f);
    padding: 20px;
    text-align: center;
    color: white;
  }
  .logo { font-size: 28px; margin-bottom: 4px; }
  .title { font-size: 16px; font-weight: 700; }
  .sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }
  .body { padding: 20px; }
  .time {
    text-align: center;
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 4px;
    font-variant-numeric: tabular-nums;
  }
  .date {
    text-align: center;
    font-size: 12px;
    color: #888;
    margin-bottom: 16px;
  }
  .btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 8px;
    transition: opacity 0.2s;
  }
  .btn:hover { opacity: 0.85; }
  .btn-clock { background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; }
  .btn-skip { background: #f5f5f5; color: #666; font-size: 12px; padding: 8px; }
  .drag { -webkit-app-region: drag; position: absolute; top: 0; left: 0; right: 0; height: 40px; }
</style>
</head>
<body>
<div class="drag"></div>
<div class="header">
  <div class="logo">🎯</div>
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
    document.getElementById('time').textContent = now.toLocaleTimeString('en-US', { hour12: false });
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  updateTime();
  setInterval(updateTime, 1000);

  function clockIn() {
    ipcRenderer.send('popup-clock-in');
  }
  function skip() {
    ipcRenderer.send('popup-skip');
  }

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
    const loggedIn = await captureCookies();
    if (loggedIn) {
      // Login ho gaya — popup dikhao
      setTimeout(() => showClockInPopup(), 1000);
    }
  });

  session.defaultSession.cookies.on('changed', async (event, cookie, cause, removed) => {
    if (!removed && (
      cookie.name === 'next-auth.session-token' ||
      cookie.name === '__Secure-next-auth.session-token'
    )) {
      setTimeout(async () => {
        await captureCookies();
      }, 500);
    }
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open Dart', click: () => mainWindow.show() },
    { label: 'Clock In', click: () => clockRequest('CLOCK_IN', 'Manual - tray') },
    { label: 'Clock Out', click: () => clockRequest('CLOCK_OUT', 'Manual - tray') },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.exit(0); } },
  ]);
  tray.setToolTip('Dart Command Center');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    name: 'Dart Command Center',
  });

  createMainWindow();
  createTray();

  setTimeout(() => {
    startTracking(BASE_URL, mainWindow);
  }, 5000);

  // Power events
  powerMonitor.on('suspend', async () => {
    console.log('💤 Suspended — clock out');
    await clockRequest('CLOCK_OUT', 'Auto - suspended');
  });

  powerMonitor.on('lock-screen', async () => {
    console.log('🔒 Locked — clock out');
    await clockRequest('CLOCK_OUT', 'Auto - locked');
  });

  powerMonitor.on('shutdown', async () => {
    await clockRequest('CLOCK_OUT', 'Auto - shutdown');
  });

  powerMonitor.on('resume', async () => {
    console.log('☀️ Resumed');
    setTimeout(async () => {
      if (isLoggedIn) {
        await clockRequest('CLOCK_IN', 'Auto - resumed');
        showClockInPopup();
      }
    }, 3000);
  });

  powerMonitor.on('unlock-screen', async () => {
    console.log('🔓 Unlocked');
    setTimeout(async () => {
      if (isLoggedIn) {
        await clockRequest('CLOCK_IN', 'Auto - unlocked');
        showClockInPopup();
      }
    }, 2000);
  });
});

// IPC handlers for popup
ipcMain.on('popup-clock-in', async () => {
  const status = await clockRequest('CLOCK_IN', 'Manual - popup');
  if (popupWindow && !popupWindow.isDestroyed()) {
    if (status === 200) {
      popupWindow.webContents.send('clock-success');
    } else {
      popupWindow.close();
    }
  }
});

ipcMain.on('popup-skip', () => {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
  }
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', async () => {
  await clockRequest('CLOCK_OUT', 'Auto - quit');
});

ipcMain.on('stop-tracking', () => stopTracking());