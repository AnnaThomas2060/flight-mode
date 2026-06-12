// Electron main process: window, persistence IPC, notifications.
const { app, BrowserWindow, ipcMain, Notification, powerMonitor, session, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const SAVE_FILE = () => path.join(app.getPath('userData'), 'flightfocus-save.json');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: 'Flight Focus',
    backgroundColor: '#0e1a2b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Progress must keep advancing when the window is blurred/minimized
      // (lenient background behavior, Section 5.5 / 6.2).
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// ---- Persistence (single JSON save file) ----

ipcMain.handle('store:load', () => {
  try {
    const raw = fs.readFileSync(SAVE_FILE(), 'utf8');
    return JSON.parse(raw);
  } catch {
    // Missing or corrupt save: renderer creates a fresh default (Section 3).
    return null;
  }
});

ipcMain.handle('store:save', (_evt, data) => {
  try {
    const file = SAVE_FILE();
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file); // atomic-ish: never leave a half-written save
    return true;
  } catch (err) {
    console.error('save failed:', err);
    return false;
  }
});

// Export/Import: the offline substitute for cloud sync (Section 3).
// The user picks the destination/source path in an OS dialog.
ipcMain.handle('store:export', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Flight Focus save',
    defaultPath: 'flightfocus-save.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false, reason: 'canceled' };
  try {
    fs.copyFileSync(SAVE_FILE(), filePath);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
});

ipcMain.handle('store:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import Flight Focus save',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths?.[0]) return { ok: false, reason: 'canceled' };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (data?.version !== 1) return { ok: false, reason: 'Not a Flight Focus save file.' };
    fs.writeFileSync(SAVE_FILE(), JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'Could not read that file as a Flight Focus save.' };
  }
});

// ---- OS notification (descent ding works while unfocused) ----

ipcMain.handle('notify', (_evt, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: true }).show();
  }
});

ipcMain.handle('window:minimize', () => { win?.minimize(); });

app.whenReady().then(() => {
  // file:// pages send no Referer header, which YouTube's embed player
  // rejects (error 153). Provide one for YouTube requests only.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/*', 'https://www.youtube-nocookie.com/*'] },
    (details, callback) => {
      details.requestHeaders['Referer'] = 'https://flight-focus.app/';
      callback({ requestHeaders: details.requestHeaders });
    });

  createWindow();

  // Forward system sleep/resume so the progress engine never credits slept
  // time as focus (Section 6.2). The renderer also has a frame-gap heuristic
  // as a backup; this is the authoritative signal.
  powerMonitor.on('suspend', () => win?.webContents.send('power', 'suspend'));
  powerMonitor.on('resume', () => win?.webContents.send('power', 'resume'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
