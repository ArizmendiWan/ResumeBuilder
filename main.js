const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const resumeLib = require('./resume-lib');

let win;
let projectDir = null;
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const iconPath = path.join(__dirname, 'icon.png');
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (_err) {
    return {};
  }
}

function saveSettings(data) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value) || 1));
}

function getZoomFactor() {
  return clampZoom(loadSettings().zoomFactor || 1);
}

function setZoomFactor(value) {
  if (!win) return;
  const zoomFactor = clampZoom(value);
  const settings = loadSettings();
  settings.zoomFactor = zoomFactor;
  saveSettings(settings);
  win.webContents.setZoomFactor(zoomFactor);
}

function changeZoom(delta) {
  const current = win ? win.webContents.getZoomFactor() : getZoomFactor();
  setZoomFactor(Math.round((current + delta) * 100) / 100);
}

function resetZoom() {
  setZoomFactor(1);
}

function getRecentProjects() {
  const settings = loadSettings();
  const projects = settings.recentProjects || [];
  return projects.filter(entry => resumeLib.isValidProjectDir(entry.path));
}

function addRecentProject(dir) {
  const settings = loadSettings();
  let projects = settings.recentProjects || [];
  projects = projects.filter(entry => entry.path !== dir);
  projects.unshift({ path: dir, name: path.basename(dir), lastOpened: Date.now() });
  settings.recentProjects = projects.slice(0, 10);
  settings.lastProjectDir = dir;
  saveSettings(settings);
}

function removeRecentProject(dir) {
  const settings = loadSettings();
  settings.recentProjects = (settings.recentProjects || []).filter(entry => entry.path !== dir);
  if (settings.lastProjectDir === dir) delete settings.lastProjectDir;
  saveSettings(settings);
}

function setProjectDir(dir) {
  projectDir = dir;
  addRecentProject(dir);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 660,
    title: 'Resume Builder',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#101114',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (app.dock && fs.existsSync(iconPath)) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

  win.webContents.on('before-input-event', (event, input) => {
    if (!(input.meta || input.control) || input.type !== 'keyDown') return;
    if (input.key === '+' || input.key === '=') {
      event.preventDefault();
      changeZoom(ZOOM_STEP);
    } else if (input.key === '-' || input.key === '_') {
      event.preventDefault();
      changeZoom(-ZOOM_STEP);
    } else if (input.key === '0') {
      event.preventDefault();
      resetZoom();
    }
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(getZoomFactor());
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CommandOrControl+=', click: () => changeZoom(ZOOM_STEP) },
        { label: 'Zoom Out', accelerator: 'CommandOrControl+-', click: () => changeZoom(-ZOOM_STEP) },
        { label: 'Actual Size', accelerator: 'CommandOrControl+0', click: resetZoom },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
        ] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  const settings = loadSettings();
  if (settings.lastProjectDir && resumeLib.isValidProjectDir(settings.lastProjectDir)) {
    projectDir = settings.lastProjectDir;
    addRecentProject(projectDir);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});

function serializeError(err) {
  return {
    ok: false,
    error: err.message,
    details: err.details || err.stack || err.message,
  };
}

function buildState() {
  if (!projectDir || !resumeLib.isValidProjectDir(projectDir)) {
    return { projectDir: null };
  }
  return {
    projectDir,
    project: resumeLib.readProject(projectDir),
    pdfPath: resumeLib.getPdfPath(projectDir),
    buildDir: resumeLib.getBuildDir(projectDir),
  };
}

async function chooseProjectDirectory(title) {
  const result = await dialog.showOpenDialog(win, {
    title,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
}

ipcMain.handle('get-state', async () => {
  return buildState();
});

ipcMain.handle('create-project', async () => {
  try {
    const dir = await chooseProjectDirectory('Choose where to create the resume project');
    if (!dir) return { projectDir: null };
    resumeLib.createProject(dir);
    setProjectDir(dir);
    return { ok: true, ...buildState() };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('open-project', async () => {
  try {
    const dir = await chooseProjectDirectory('Open a resume builder project');
    if (!dir) return { projectDir: null };
    if (!resumeLib.isValidProjectDir(dir)) {
      throw new Error('Selected folder does not contain a valid resume.json project.');
    }
    setProjectDir(dir);
    return { ok: true, ...buildState() };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('open-recent-project', async (_event, dir) => {
  try {
    if (!resumeLib.isValidProjectDir(dir)) {
      removeRecentProject(dir);
      throw new Error('Project is no longer available or no longer contains resume.json.');
    }
    setProjectDir(dir);
    return { ok: true, ...buildState() };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('remove-recent-project', async (_event, dir) => {
  removeRecentProject(dir);
  return getRecentProjects();
});

ipcMain.handle('get-recent-projects', async () => {
  return getRecentProjects();
});

ipcMain.handle('save-project', async (_event, project) => {
  try {
    if (!projectDir) throw new Error('Project not selected.');
    const normalized = resumeLib.writeProject(projectDir, project);
    return { ok: true, project: normalized, pdfPath: resumeLib.getPdfPath(projectDir) };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('render-latex', async (_event, project) => {
  try {
    if (!projectDir) throw new Error('Project not selected.');
    const normalized = resumeLib.writeProject(projectDir, project);
    const result = resumeLib.renderLatex(projectDir, normalized);
    return { ok: true, project: normalized, ...result, pdfPath: resumeLib.getPdfPath(projectDir) };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('compile', async (_event, project) => {
  try {
    if (!projectDir) throw new Error('Project not selected.');
    const normalized = resumeLib.writeProject(projectDir, project);
    const result = resumeLib.compileProject(projectDir, normalized);
    return { ok: true, project: normalized, ...result };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('export-pdf', async (_event, project) => {
  try {
    if (!projectDir) throw new Error('Project not selected.');
    if (project) resumeLib.writeProject(projectDir, project);
    const current = resumeLib.readProject(projectDir);
    const safeName = (current.profile.name || 'Resume').replace(/[^\w.-]+/g, '_');
    const result = await dialog.showSaveDialog(win, {
      title: 'Export PDF',
      defaultPath: `${safeName}_Resume.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const destinationPath = resumeLib.exportPdf(projectDir, result.filePath);
    return { ok: true, destinationPath };
  } catch (err) {
    return serializeError(err);
  }
});

ipcMain.handle('open-project-folder', async () => {
  if (projectDir) await shell.openPath(projectDir);
});

ipcMain.handle('app-zoom', async (_event, action) => {
  if (action === 'in') changeZoom(ZOOM_STEP);
  else if (action === 'out') changeZoom(-ZOOM_STEP);
  else resetZoom();
  return { ok: true, zoomFactor: win ? win.webContents.getZoomFactor() : getZoomFactor() };
});
