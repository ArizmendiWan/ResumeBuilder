const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  selectProject: () => ipcRenderer.invoke('select-project'),
  save: (payload) => ipcRenderer.invoke('save', payload),
  saveAndCompile: (payload) => ipcRenderer.invoke('save-and-compile', payload),
  compile: () => ipcRenderer.invoke('compile'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  getRecentDirs: () => ipcRenderer.invoke('get-recent-dirs'),
  openRecentDir: (dir) => ipcRenderer.invoke('open-recent-dir', dir),
  removeRecentDir: (dir) => ipcRenderer.invoke('remove-recent-dir', dir)
});
