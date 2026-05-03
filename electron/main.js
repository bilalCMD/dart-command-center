// electron/main.js
// Dart Command Center - Desktop App Main Process

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Development vs Production check
const isDev = !app.isPackaged;

// URL to load
// In dev: localhost:3000 (Next.js dev server)
// In production: portal.dartwebsite.com (live site)
const APP_URL = isDev 
  ? 'http://localhost:3000' 
  : 'https://portal.dartwebsite.com';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Dart Command Center',
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Don't show until ready (no white flash)
    autoHideMenuBar: true, // Hide menu bar (cleaner look)
  });

  // Load the app
  mainWindow.loadURL(APP_URL);

  // Show when ready (smoother experience)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in default browser (not desktop app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Mac: re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows closed (except on Mac)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e, url) => {
    const parsedUrl = new URL(url);
    const allowedHosts = ['localhost', 'portal.dartwebsite.com'];
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
});