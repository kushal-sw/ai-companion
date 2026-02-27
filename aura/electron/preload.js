// Context bridge
// → Exposes electronAPI to React safely

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
});
