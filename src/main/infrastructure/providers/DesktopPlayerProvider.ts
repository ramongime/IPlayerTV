import os from 'node:os';
import { shell } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import type { IPlayerProvider } from '../../core/services/IPlayerProvider';

const execFileAsync = promisify(execFile);

export class DesktopPlayerProvider implements IPlayerProvider {
  constructor(private getSettings: () => { externalPlayers: { vlcPath?: string; mpvPath?: string } }) {}

  async play(url: string, player: 'vlc' | 'mpv' | 'browser', title?: string) {
    if (player === 'browser') {
      await shell.openExternal(url);
      return { method: 'browser', url, success: true };
    }

    const settings = this.getSettings();
    let binaryPath = player === 'vlc' ? settings.externalPlayers.vlcPath : settings.externalPlayers.mpvPath;

    if (!binaryPath) {
      binaryPath = this.detectBinary(player);
    }

    if (!binaryPath || !existsSync(binaryPath)) {
      throw new Error(`Configure o caminho do ${player.toUpperCase()} nas configurações.`);
    }

    const platform = os.platform();
    let args: string[] = [];

    if (player === 'vlc') {
      args = platform === 'darwin'
        ? [...(title ? [`--meta-title=${title}`] : []), url]
        : ['--one-instance', '--playlist-enqueue', ...(title ? [`--meta-title=${title}`] : []), url];
    } else {
      args = ['--force-window=yes', ...(title ? [`--title=${title}`] : []), url];
    }

    await execFileAsync(binaryPath, args);
    return { method: player, url, success: true };
  }

  private detectBinary(player: 'vlc' | 'mpv'): string | undefined {
    const platform = os.platform();
    if (player === 'vlc') {
      if (platform === 'darwin') return '/Applications/VLC.app/Contents/MacOS/VLC';
      if (platform === 'win32') {
        const winPaths = ['C:\\Program Files\\VideoLAN\\VLC\\vlc.exe', 'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'];
        return winPaths.find(p => existsSync(p));
      }
      if (platform === 'linux') return '/usr/bin/vlc';
    } else if (player === 'mpv') {
      if (platform === 'darwin') {
        const macPaths = ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv', '/Applications/mpv.app/Contents/MacOS/mpv'];
        return macPaths.find(p => existsSync(p));
      }
      if (platform === 'win32') {
        const winPaths = ['C:\\Program Files\\mpv\\mpv.exe', 'C:\\mpv\\mpv.exe'];
        return winPaths.find(p => existsSync(p));
      }
      if (platform === 'linux') return '/usr/bin/mpv';
    }
    return undefined;
  }
}
