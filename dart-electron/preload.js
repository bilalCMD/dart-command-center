const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dartApp', {
  stopTracking: () => ipcRenderer.send('stop-tracking'),
  isElectron: true,
});