import { ipcMain } from 'electron';

/** Only allow the renderer to open real web URLs externally — never file:, javascript:, etc. */
function isSafeExternalUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function registerWindowIPC() {
  ipcMain.handle('window:togglePip', (event, enable: boolean) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setAlwaysOnTop(enable, 'floating');
      win.setVisibleOnAllWorkspaces(enable);
      if (enable) {
        win.setMinimumSize(400, 225); // Permite encolher abaixo de 1200x720
        win.setSize(400, 225);
      } else {
        win.setMinimumSize(1200, 720); // Restaura o limite original
        win.setSize(1200, 720);
      }
    }
  });

  ipcMain.handle('window:download', (event, url: string) => {
    event.sender.downloadURL(url);
  });

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    if (!isSafeExternalUrl(url)) {
      console.warn('[shell:openExternal] blocked non-http(s) URL:', url);
      return;
    }
    const { shell } = await import('electron');
    await shell.openExternal(url);
  });
}
