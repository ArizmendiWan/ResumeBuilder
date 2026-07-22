const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  createProject: () => ipcRenderer.invoke('create-project'),
  openProject: () => ipcRenderer.invoke('open-project'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  renderLatex: (project) => ipcRenderer.invoke('render-latex', project),
  compile: (project) => ipcRenderer.invoke('compile', project),
  exportPdf: (project) => ipcRenderer.invoke('export-pdf', project),
  openProjectFolder: () => ipcRenderer.invoke('open-project-folder'),
  appZoom: (action) => ipcRenderer.invoke('app-zoom', action),
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  openRecentProject: (dir) => ipcRenderer.invoke('open-recent-project', dir),
  removeRecentProject: (dir) => ipcRenderer.invoke('remove-recent-project', dir),
});
