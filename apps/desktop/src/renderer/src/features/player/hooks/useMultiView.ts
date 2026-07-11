import { useState } from 'react';
import type { StreamItem } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';

export function useMultiView(activeAccountId?: string) {
  const { t } = useTranslation();
  const [multiViewStreams, setMultiViewStreams] = useState<Array<{ url: string; title: string; id: string }>>([]);
  const [multiViewMinimized, setMultiViewMinimized] = useState(false);

  const addMultiView = async (stream: StreamItem) => {
    if (!activeAccountId) return;
    if (multiViewStreams.length >= 4) {
      alert(t('player.limitReached'));
      return;
    }
    const streamId = stream.stream_id ?? 0;
    if (multiViewStreams.find(s => s.id === String(streamId))) {
      return;
    }
    try {
      const result = await window.xtremeApi.player.resolveUrl({
        accountId: activeAccountId,
        contentType: 'live',
        streamId,
        extension: 'm3u8'
      });
      setMultiViewStreams(prev => [...prev, { url: result.url, title: stream.name || 'Ao Vivo', id: String(streamId) }]);
      setMultiViewMinimized(false);
    } catch (err: any) {
      console.error('Failed to add to multiview:', err);
    }
  };

  const removeStream = (id: string) => {
    setMultiViewStreams(prev => prev.filter(s => s.id !== id));
  };

  const closeMultiView = () => {
    setMultiViewStreams([]);
    setMultiViewMinimized(false);
  };

  return {
    multiViewStreams,
    multiViewMinimized,
    setMultiViewMinimized,
    addMultiView,
    removeStream,
    closeMultiView
  };
}
