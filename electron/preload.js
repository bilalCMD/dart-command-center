// electron/preload.js
// Security bridge between Electron and your web app

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the web app
// Web app ye access kar sakega: window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,
  isDesktop: true,

  // Window controls (future use)
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Notifications (future use)
  showNotification: (title, body) => 
    ipcRenderer.send('notification:show', { title, body }),

  // Activity tracking (Phase 3 - future)
  startTracking: () => ipcRenderer.invoke('tracking:start'),
  stopTracking: () => ipcRenderer.invoke('tracking:stop'),
  getActiveWindow: () => ipcRenderer.invoke('tracking:active-window'),

  // Idle detection (Phase 4 - future)
  getIdleTime: () => ipcRenderer.invoke('idle:get-time'),

  // Auto-launch (Phase 2 - future)
  setAutoLaunch: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('autolaunch:get'),
});

// Log when preload runs (helpful for debugging)
console.log('[Dart Desktop] Preload loaded successfully');
console.log('[Dart Desktop] Platform:', process.platform);
console.log('[Dart Desktop] Electron version:', process.versions.electron);