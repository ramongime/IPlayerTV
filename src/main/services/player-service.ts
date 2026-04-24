import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { SettingsService } from './settings-service';

const execFileAsync = promisify(execFile);

export class PlayerService {
  private settingsService = new SettingsService();

  async open(url: string, player: 'vlc' | 'mpv' | 'browser', title?: string) {
    if (player === 'browser') {
      return { method: 'browser', url };
    }

    const settings = this.settingsService.get();
    let binaryPath = player === 'vlc' ? settings.externalPlayers.vlcPath : settings.externalPlayers.mpvPath;

    if (!binaryPath) {
      const platform = os.platform();
      if (player === 'vlc') {
        if (platform === 'darwin') binaryPath = '/Applications/VLC.app/Contents/MacOS/VLC';
        else if (platform === 'win32') {
          const winPaths = ['C:\\Program Files\\VideoLAN\\VLC\\vlc.exe', 'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'];
          binaryPath = winPaths.find(p => existsSync(p));
        }
        else if (platform === 'linux') binaryPath = '/usr/bin/vlc';
      } else if (player === 'mpv') {
        if (platform === 'darwin') {
          const macPaths = ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv', '/Applications/mpv.app/Contents/MacOS/mpv'];
          binaryPath = macPaths.find(p => existsSync(p));
        } else if (platform === 'win32') {
          const winPaths = ['C:\\Program Files\\mpv\\mpv.exe', 'C:\\mpv\\mpv.exe'];
          binaryPath = winPaths.find(p => existsSync(p));
        } else if (platform === 'linux') {
          binaryPath = '/usr/bin/mpv';
        }
      }
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
    return { method: player, url };
  }
}
