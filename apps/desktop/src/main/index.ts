import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { registerControllers } from './presentation/controllers';
import { autoUpdater } from 'electron-updater';

app.commandLine.appendSwitch('enable-features', 'CastMediaRouteProvider');

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#0b1220',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  const { session } = window.webContents;
  session.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;
    if (responseHeaders) {
      responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS'];
    }
    callback({ responseHeaders });
  });

  const devServerUrl = 'http://localhost:5173';

  if (!app.isPackaged) {
    window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch {
      // ignore malformed URLs
    }
    return { action: 'deny' };
  });
}

if (process.platform === 'darwin') {
  app.name = 'IPlayerTV';
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../../assets/icon.png'));
  }

  app.setAboutPanelOptions({
    applicationName: 'IPlayerTV',
    applicationVersion: app.getVersion(),
    iconPath: path.join(__dirname, '../../assets/icon.png'),
    copyright: 'Copyright © 2026 Ramon Gimenes'
  });

  registerControllers();
  createWindow();

  // Check for updates
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Failed to check for updates:', err);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
