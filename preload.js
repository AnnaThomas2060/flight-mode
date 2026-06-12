// contextBridge: the only door between renderer and Node (Section 9).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),
  exportSave: () => ipcRenderer.invoke('store:export'),
  importSave: () => ipcRenderer.invoke('store:import'),
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body }),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  onPower: (cb) => ipcRenderer.on('power', (_evt, state) => cb(state))
});
