import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { StreamItem, EpgProgramme } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

interface EpgGridProps {
  accountId: string;
  streams: StreamItem[];
  onPlayLive: (streamId: number, title: string) => void;
  onPlayArchive: (streamId: number, title: string, startRaw: string, durationMinutes: number) => void;
}

export function EpgGrid({ accountId, streams, onPlayLive, onPlayArchive }: EpgGridProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const streamIds = useMemo(() => streams.slice(0, 150).map(s => s.stream_id).filter(Boolean).join(','), [streams]);

  const epgQuery = useQuery({
    queryKey: ['epg-table', accountId, streamIds],
    queryFn: async () => {
      if (!accountId || !streamIds) return {};
      return window.xtremeApi.xtream.epgTable(accountId, streamIds);
    },
    enabled: !!accountId && !!streamIds,
    staleTime: 5 * 60 * 1000,
  });

  const epgData = epgQuery.data || {};

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const PIXELS_PER_MINUTE = 5;
  const startOfDay = useMemo(() => {
    const d = new Date(currentTime);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentTime.getDate()]);
  
  const currentMinutesFromStart = Math.floor((currentTime.getTime() - startOfDay.getTime()) / 60000);

  useEffect(() => {
    if (containerRef.current) {
      const scrollPos = (currentMinutesFromStart - 30) * PIXELS_PER_MINUTE;
      containerRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  }, [currentMinutesFromStart]);

  const renderTimelineHeaders = () => {
    const headers = [];
    for (let i = 0; i < 24; i++) {
      for (let m = 0; m < 60; m += 30) {
        const minutes = i * 60 + m;
        headers.push(
          <div
            key={`${i}:${m}`}
            className="epg-time-marker"
            style={{ left: `${minutes * PIXELS_PER_MINUTE}px`, width: `${30 * PIXELS_PER_MINUTE}px` }}
          >
            {String(i).padStart(2, '0')}:{String(m).padStart(2, '0')}
          </div>
        );
      }
    }
    return headers;
  };

  const calculateProgramBounds = useCallback((prog: EpgProgramme) => {
    if (!prog.start_raw || !prog.end_raw) return null;
    const pStart = new Date(prog.start_raw.replace(' ', 'T')).getTime();
    const pEnd = new Date(prog.end_raw.replace(' ', 'T')).getTime();
    if (isNaN(pStart) || isNaN(pEnd)) return null;

    const startMins = (pStart - startOfDay.getTime()) / 60000;
    const endMins = (pEnd - startOfDay.getTime()) / 60000;
    const durationMins = endMins - startMins;

    if (endMins < 0 || startMins > 24 * 60) return null;

    return {
      left: Math.max(0, startMins * PIXELS_PER_MINUTE),
      width: Math.max(0, durationMins * PIXELS_PER_MINUTE),
      durationMins,
      isNow: pStart <= currentTime.getTime() && pEnd > currentTime.getTime(),
      isPast: pEnd <= currentTime.getTime()
    };
  }, [startOfDay, currentTime]);

  const handleProgramClick = (streamId: number, title: string, prog: EpgProgramme, bounds: any) => {
    if (bounds.isNow) {
      onPlayLive(streamId, title);
    } else if (bounds.isPast && prog.has_archive === 1 && prog.start_raw) {
      onPlayArchive(streamId, prog.title || title, prog.start_raw, Math.floor(bounds.durationMins));
    }
  };

  if (epgQuery.isLoading) {
    return (
      <div className="epg-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>{t('epg.loading')}</p>
      </div>
    );
  }

  return (
    <div className="epg-container">
      <div className="epg-header">
        <div className="epg-corner">EPG</div>
        <div className="epg-timeline" ref={containerRef} style={{ overflowX: 'hidden' }}>
          {renderTimelineHeaders()}
        </div>
      </div>

      <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
        <Virtuoso
          style={{ height: '100%' }}
          data={streams}
          onScroll={(e) => {
            if (containerRef.current) {
              containerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
            }
          }}
          components={{
            List: React.forwardRef((props, ref) => (
              <div {...props} ref={ref} style={{ ...props.style, minWidth: 'max-content', position: 'relative' }}>
                <div
                  className="epg-now-line"
                  style={{ left: `${currentMinutesFromStart * PIXELS_PER_MINUTE + 120}px` }}
                />
                {props.children}
              </div>
            ))
          }}
          itemContent={(index, stream) => {
            const streamId = stream.stream_id as number;
            const programmes = epgData[String(streamId)] || (stream.epg_channel_id ? epgData[stream.epg_channel_id] : null) || [];

            return (
              <div className="epg-row" style={{ width: 'max-content', minWidth: '100%' }}>
                <div className="epg-channel-cell">
                  {stream.stream_icon ? (
                    <img src={stream.stream_icon} alt={stream.name} className="epg-channel-logo" loading="lazy" onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : (
                    <div className="epg-channel-logo" style={{ background: '#334155', width: 40, height: 40 }} />
                  )}
                  <span className="epg-channel-name" title={stream.name}>{stream.name}</span>
                </div>

                <div className="epg-programs-container">
                  {programmes.map((prog, idx) => {
                    const bounds = calculateProgramBounds(prog);
                    if (!bounds) return null;

                    const titleStr = prog.title ? prog.title : t('epg.noEpg');

                    return (
                      <div
                        key={idx}
                        className={`epg-program ${bounds.isNow ? 'now-playing' : ''} ${bounds.isPast && prog.has_archive === 1 ? 'has-archive' : ''}`}
                        style={{ left: `${bounds.left}px`, width: `${bounds.width}px` }}
                        onClick={() => handleProgramClick(streamId, stream.name, prog, bounds)}
                        title={`${titleStr}\n${prog.start} - ${prog.end}${bounds.isPast && prog.has_archive ? '\n(Catch-up Disponível)' : ''}`}
                      >
                        <div className="epg-program-title">{titleStr || t('epg.noEpg')}</div>
                        <div className="epg-program-time">{prog.start} - {prog.end}</div>
                      </div>
                    );
                  })}
                  {programmes.length === 0 && (
                    <div className="epg-program" style={{ left: 0, width: '100%', background: 'transparent', border: 'none', color: '#64748b' }}>
                      {t('epg.noEpg')}
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
