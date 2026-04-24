export interface IPlayerProvider {
  play(url: string, playerType: 'vlc' | 'mpv' | 'browser', title?: string): Promise<{ method: string; url: string; success: boolean }>;
}
