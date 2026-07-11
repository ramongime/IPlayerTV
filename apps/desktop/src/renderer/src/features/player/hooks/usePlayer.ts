import { useState, ReactNode } from 'react';
import type { Account, ContentType, Episode, StreamItem, EpgProgramme } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';

interface UsePlayerParams {
  accounts: Account[];
  activeAccountId?: string;
  activeTab: ContentType;
  invalidateLibrary: () => void;
  onShowInspectModal?: (show: boolean) => void;
  onSetSidebarOpen?: (open: boolean) => void;
}

export function usePlayer({
  accounts,
  activeAccountId,
  activeTab,
  invalidateLibrary,
  onShowInspectModal,
  onSetSidebarOpen
}: UsePlayerParams) {
  const { t } = useTranslation();
  const [lastPlayMessage, setLastPlayMessage] = useState<ReactNode>();
  const [internalPlayerUrl, setInternalPlayerUrl] = useState<{ url: string; title: string; contentType: ContentType; streamId?: number; accountId?: string }>();

  const playItem = async (stream: StreamItem, options?: { contentType?: 'series' | 'movie' | 'live'; streamId?: number; extension?: string; name?: string }) => {
    if (!activeAccountId) return;
    const account = accounts.find(a => a.id === activeAccountId);
    if (!account) return;

    const streamId = options?.streamId ?? stream.stream_id ?? stream.series_id ?? 0;
    const contentType = options?.contentType ?? activeTab;
    const streamName = options?.name ?? stream.name;

    if (account.player === 'internal') {
      let forcedExtension = options?.extension || stream.container_extension;
      if (contentType === 'live') {
        forcedExtension = 'm3u8';
      } else if (!forcedExtension || forcedExtension === 'mkv' || forcedExtension === 'ts') {
        forcedExtension = 'mp4';
      }

      try {
        const result = await window.xtremeApi.player.resolveUrl({
          accountId: activeAccountId,
          contentType: contentType,
          streamId,
          extension: forcedExtension
        });

        setInternalPlayerUrl({
          url: result.url,
          title: options?.name || stream.name,
          contentType: options?.contentType || activeTab,
          streamId,
          accountId: activeAccountId
        });
        onSetSidebarOpen?.(false);
        setLastPlayMessage(undefined);
      } catch (err: any) {
        setLastPlayMessage(<span style={{ color: '#ff8585' }}>Error: {err.message}</span>);
        setTimeout(() => setLastPlayMessage(undefined), 5000);
      }
      return;
    }

    try {
      const result = await window.xtremeApi.player.open({
        accountId: activeAccountId,
        contentType,
        streamId,
        name: streamName,
        extension: options?.extension ?? stream.container_extension
      });

      if (account.player === 'browser') {
        setLastPlayMessage(
          <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {t('player.browserOpened')}
            <button
              onClick={() => window.xtremeApi.shell.openExternal(result.url)}
              style={{ background: 'none', border: 'none', color: '#4cc9f0', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
            >
              {t('player.clickIfNotOpened')}
            </button>
          </span>
        );
      } else {
        setLastPlayMessage(t('player.playingVia', { method: result.method.toUpperCase() }));
      }

      invalidateLibrary();
    } catch (err: any) {
      setLastPlayMessage(<span style={{ color: '#ff8585' }}>Error: {err.message}</span>);
      setTimeout(() => setLastPlayMessage(undefined), 5000);
    }
  };

  const playEpisode = async (selectedStream: StreamItem | undefined, episode: Episode) => {
    if (!selectedStream) return;
    await playItem(selectedStream, {
      contentType: 'series',
      streamId: episode.id as number,
      extension: episode.container_extension,
      name: `${selectedStream.name} - S${(episode.season ?? 0).toString().padStart(2, '0')}E${(episode.episode_num ?? 0).toString().padStart(2, '0')}`
    });
  };

  const playCatchup = async (selectedStream: StreamItem | undefined, epg: EpgProgramme) => {
    if (!selectedStream || !activeAccountId || !epg.start_raw || !epg.end_raw) return;
    const account = accounts.find(a => a.id === activeAccountId);
    if (!account) return;

    const startObj = new Date(epg.start_raw.replace(' ', 'T'));
    const endObj = new Date(epg.end_raw.replace(' ', 'T'));
    let durationMinutes = Math.floor((endObj.getTime() - startObj.getTime()) / 60000);
    if (isNaN(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;

    const streamId = selectedStream.stream_id ?? selectedStream.series_id ?? 0;
    const name = `${selectedStream.name} (Gravação: ${epg.title})`;

    if (account.player === 'internal') {
      try {
        const result = await window.xtremeApi.player.resolveCatchupUrl({
          accountId: activeAccountId,
          streamId,
          startRaw: epg.start_raw,
          durationMinutes,
          extension: 'm3u8'
        });
        setInternalPlayerUrl({ url: result.url, title: name, contentType: 'live' });
        setLastPlayMessage(undefined);
        onShowInspectModal?.(false);
      } catch (err: any) {
        setLastPlayMessage(<span style={{ color: '#ff8585' }}>Error: {err.message}</span>);
        setTimeout(() => setLastPlayMessage(undefined), 5000);
      }
      return;
    }

    try {
      const result = await window.xtremeApi.player.openCatchup({
        accountId: activeAccountId,
        streamId,
        name,
        startRaw: epg.start_raw,
        durationMinutes,
        extension: 'm3u8'
      });

      if (account.player === 'browser') {
        setLastPlayMessage(
          <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {t('player.recordingBrowserOpened')}
            <button
              onClick={() => window.xtremeApi.shell.openExternal(result.url)}
              style={{ background: 'none', border: 'none', color: '#4cc9f0', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
            >
              {t('player.clickIfNotOpened')}
            </button>
          </span>
        );
      } else {
        setLastPlayMessage(t('player.playingRecordingVia', { method: result.method.toUpperCase() }));
      }
      onShowInspectModal?.(false);
    } catch (err: any) {
      setLastPlayMessage(<span style={{ color: '#ff8585' }}>Error: {err.message}</span>);
      setTimeout(() => setLastPlayMessage(undefined), 5000);
    }
  };

  return {
    playItem,
    playEpisode,
    playCatchup,
    lastPlayMessage,
    setLastPlayMessage,
    internalPlayerUrl,
    setInternalPlayerUrl
  };
}
