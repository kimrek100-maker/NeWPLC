const {contextBridge, ipcRenderer} = require('electron');
// Only exposes the per-launch loopback API token, no filesystem or shell access.
contextBridge.exposeInMainWorld('studio',{token:ipcRenderer.sendSync('studio-token')});
