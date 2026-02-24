const { app, BrowserWindow, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const resumeLib = require('./resume-lib');

let win;
let resumeDir = null;
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const iconPath = path.join(__dirname, 'icon.png');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function saveSettings(data) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}

function getRecentDirs() {
  const settings = loadSettings();
  const dirs = settings.recentDirs || [];
  return dirs.filter(entry => resumeLib.isValidResumeDir(entry.path));
}

function addRecentDir(dir) {
  const settings = loadSettings();
  let dirs = settings.recentDirs || [];
  dirs = dirs.filter(e => e.path !== dir);
  dirs.unshift({ path: dir, name: path.basename(dir), lastOpened: Date.now() });
  if (dirs.length > 10) dirs = dirs.slice(0, 10);
  settings.recentDirs = dirs;
  saveSettings(settings);
}

function removeRecentDir(dir) {
  const settings = loadSettings();
  let dirs = settings.recentDirs || [];
  dirs = dirs.filter(e => e.path !== dir);
  settings.recentDirs = dirs;
  saveSettings(settings);
}

function setResumeDir(dir) {
  resumeDir = dir;
  addRecentDir(dir);
  const settings = loadSettings();
  settings.lastResumeDir = dir;
  saveSettings(settings);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Resume Picker',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0f0f0f',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  if (app.dock && fs.existsSync(iconPath)) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  const settings = loadSettings();
  if (settings.lastResumeDir && resumeLib.isValidResumeDir(settings.lastResumeDir)) {
    resumeDir = settings.lastResumeDir;
    addRecentDir(resumeDir);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});

async function selectProjectDirectory() {
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose your Resume folder',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  const dir = result.filePaths[0];
  if (!resumeLib.isValidResumeDir(dir)) {
    throw new Error('Selected folder does not look like a Resume project (missing main.tex, preamble.tex, etc.).');
  }
  setResumeDir(dir);
  return dir;
}

function buildState() {
  if (!resumeDir || !resumeLib.isValidResumeDir(resumeDir)) {
    return { resumeDir: null };
  }
  return {
    resumeDir,
    resume: resumeLib.readResume(resumeDir),
    config: resumeLib.readConfig(resumeDir),
    pdfPath: resumeLib.getPdfPath(resumeDir)
  };
}

ipcMain.handle('get-state', async () => {
  return buildState();
});

ipcMain.handle('select-project', async () => {
  const dir = await selectProjectDirectory().catch(err => ({ error: err.message }));
  if (!dir || dir.error) {
    return { resumeDir: null, error: dir?.error };
  }
  return buildState();
});

ipcMain.handle('save', async (_event, payload) => {
  if (!resumeDir) throw new Error('Project not selected');
  resumeLib.writeResume(resumeDir, payload.sections);
  resumeLib.writeConfig(resumeDir, payload.config);
  return { ok: true };
});

ipcMain.handle('save-and-compile', async (_event, payload) => {
  if (!resumeDir) throw new Error('Project not selected');
  resumeLib.writeResume(resumeDir, payload.sections);
  resumeLib.writeConfig(resumeDir, payload.config);
  resumeLib.compileResume(resumeDir);
  return { ok: true, pdfPath: resumeLib.getPdfPath(resumeDir) };
});

ipcMain.handle('compile', async () => {
  if (!resumeDir) throw new Error('Project not selected');
  resumeLib.compileResume(resumeDir);
  return { ok: true, pdfPath: resumeLib.getPdfPath(resumeDir) };
});

ipcMain.handle('get-recent-dirs', async () => {
  return getRecentDirs();
});

ipcMain.handle('open-recent-dir', async (_event, dir) => {
  if (!resumeLib.isValidResumeDir(dir)) {
    removeRecentDir(dir);
    return { resumeDir: null, error: 'Folder is no longer a valid Resume project.' };
  }
  setResumeDir(dir);
  return buildState();
});

ipcMain.handle('remove-recent-dir', async (_event, dir) => {
  removeRecentDir(dir);
  return getRecentDirs();
});

ipcMain.handle('open-folder', async () => {
  if (resumeDir) {
    await shell.openPath(resumeDir);
  }
});
