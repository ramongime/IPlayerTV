import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { StreamItem, EpgProgramme } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

export interface VirtualizedEpgGridProps {
  accountId: string;
  streams: StreamItem[];
  onPlayLive: (streamId: number, title: string) => void;
  onPlayArchive: (streamId: number, title: string, startRaw: string, durationMinutes: number) => void;
}

const PIXELS_PER_MINUTE = 5;
const BUFFER_MINUTES = 60; // 1 hour window buffer left/right

export function VirtualizedEpgGrid({ accountId, streams, onPlayLive, onPlayArchive }: VirtualizedEpgGridProps) {
  const { t } = useTranslation();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 40 });

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute start of day (midnight)
  const startOfDay = useMemo(() => {
    const d = new Date(currentTime);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()]);

  const currentMinutesFromStart = Math.floor((currentTime.getTime() - startOfDay.getTime()) / 60000);

  // ResizeObserver to track grid width for accurate windowing
  useEffect(() => {
    if (!bodyScrollRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(bodyScrollRef.current);
    return () => observer.disconnect();
  }, []);

  // Initial scroll to current time
  useEffect(() => {
    if (headerScrollRef.current) {
      const scrollPos = Math.max(0, (currentMinutesFromStart - 30) * PIXELS_PER_MINUTE);
      headerScrollRef.current.scrollLeft = scrollPos;
      setScrollLeft(scrollPos);
    }
  }, [currentMinutesFromStart]);

  // Horizontal windowing calculation: visible minute range [startMins, endMins]
  const visibleTimeWindow = useMemo(() => {
    const startMins = Math.max(0, Math.floor(scrollLeft / PIXELS_PER_MINUTE) - BUFFER_MINUTES);
    const endMins = Math.ceil((scrollLeft + containerWidth) / PIXELS_PER_MINUTE) + BUFFER_MINUTES;
    return { startMins, endMins };
  }, [scrollLeft, containerWidth]);

  // Vertical windowing channel subset: fetch EPG data for visible channel viewport (+30 buffer)
  const visibleStreams = useMemo(() => {
    const start = Math.max(0, visibleRange.startIndex - 20);
    const end = Math.min(streams.length, visibleRange.endIndex + 20);
    return streams.slice(start, end);
  }, [streams, visibleRange.startIndex, visibleRange.endIndex]);

  const streamIdsStr = useMemo(() => {
    return visibleStreams.map(s => s.stream_id).filter(Boolean).join(',');
  }, [visibleStreams]);

  const epgQuery = useQuery({
    queryKey: ['epg-table', accountId, streamIdsStr],
    queryFn: async () => {
      if (!accountId || !streamIdsStr) return {};
      return window.xtremeApi.xtream.epgTable(accountId, streamIdsStr);
    },
    enabled: !!accountId && !!streamIdsStr,
    staleTime: 5 * 60 * 1000,
  });

  const epgData = epgQuery.data || {};

  // Synchronized horizontal scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const targetScrollLeft = (e.target as HTMLDivElement).scrollLeft;
    setScrollLeft(targetScrollLeft);
    if (headerScrollRef.current && headerScrollRef.current !== e.target) {
      headerScrollRef.current.scrollLeft = targetScrollLeft;
    }
  }, []);

  // Header 30-minute interval markers
  const renderTimelineHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < 24; i++) {
      for (let m = 0; m < 60; m += 30) {
        const minutes = i * 60 + m;
        headers.push(
          <div
            key={`${i}:${m}`}
            className="epg-time-marker"
            style={{
              position: 'absolute',
              left: `${minutes * PIXELS_PER_MINUTE}px`,
              width: `${30 * PIXELS_PER_MINUTE}px`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.7)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {String(i).padStart(2, '0')}:{String(m).padStart(2, '0')}
          </div>
        );
      }
    }
    return headers;
  }, []);

  // Compute program bounds and determine if visible within [visibleTimeWindow]
  const calculateProgramBounds = useCallback((prog: EpgProgramme) => {
    if (!prog.start_raw || !prog.end_raw) return null;
    const pStart = new Date(prog.start_raw.replace(' ', 'T')).getTime();
    const pEnd = new Date(prog.end_raw.replace(' ', 'T')).getTime();
    if (isNaN(pStart) || isNaN(pEnd)) return null;

    const startMins = (pStart - startOfDay.getTime()) / 60000;
    const endMins = (pEnd - startOfDay.getTime()) / 60000;
    const durationMins = endMins - startMins;

    // Horizontal windowing check: skip rendering if entirely outside visible window
    if (endMins < visibleTimeWindow.startMins || startMins > visibleTimeWindow.endMins) {
      return null;
    }

    return {
      left: Math.max(0, startMins * PIXELS_PER_MINUTE),
      width: Math.max(0, durationMins * PIXELS_PER_MINUTE),
      durationMins,
      isNow: pStart <= currentTime.getTime() && pEnd > currentTime.getTime(),
      isPast: pEnd <= currentTime.getTime()
    };
  }, [startOfDay, currentTime, visibleTimeWindow.startMins, visibleTimeWindow.endMins]);

  const handleProgramClick = (streamId: number, title: string, prog: EpgProgramme, bounds: any) => {
    if (bounds.isNow) {
      onPlayLive(streamId, title);
    } else if (bounds.isPast && prog.has_archive === 1 && prog.start_raw) {
      onPlayArchive(streamId, prog.title || title, prog.start_raw, Math.floor(bounds.durationMins));
    }
  };

  return (
    <div className="epg-container" ref={bodyScrollRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Sticky Timeline Header */}
      <div className="epg-header" style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: '#1e293b', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="epg-corner" style={{ width: 220, flexShrink: 0, padding: '12px 16px', fontWeight: 600, color: '#f8fafc', background: '#0f172a' }}>
          {t('epg.title', 'Canais EPG')}
        </div>
        <div
          className="epg-timeline"
          ref={headerScrollRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative', height: 44, scrollbarWidth: 'none' }}
        >
          <div style={{ width: 24 * 60 * PIXELS_PER_MINUTE, height: '100%', position: 'relative' }}>
            {renderTimelineHeaders}
          </div>
        </div>
      </div>

      {/* Virtuoso 2D Windowed Channel Rows */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
        <Virtuoso
          style={{ height: '100%' }}
          data={streams}
          rangeChanged={setVisibleRange}
          onScroll={handleScroll}
          components={{
            List: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
              <div {...props} ref={ref} style={{ ...props.style, minWidth: 'max-content', position: 'relative' }}>
                <div
                  className="epg-now-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${currentMinutesFromStart * PIXELS_PER_MINUTE + 220}px`,
                    width: '2px',
                    backgroundColor: '#ef4444',
                    zIndex: 15,
                    pointerEvents: 'none'
                  }}
                />
                {props.children}
              </div>
            ))
          }}
          itemContent={(_, stream) => {
            const streamId = stream.stream_id as number;
            const programmes: EpgProgramme[] = epgData[String(streamId)] || (stream.epg_channel_id ? epgData[stream.epg_channel_id] : null) || [];

            return (
              <div className="epg-row" style={{ display: 'flex', height: 54, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: 'max-content', minWidth: '100%' }}>
                {/* Channel Header Cell */}
                <div className="epg-channel-cell" style={{ width: 220, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', background: '#0f172a', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {stream.stream_icon ? (
                    <img
                      src={stream.stream_icon}
                      alt={stream.name}
                      style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }}
                      loading="lazy"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  ) : (
                    <div style={{ width: 32, height: 32, background: '#334155', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {stream.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="epg-channel-name" title={stream.name} style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stream.name}
                  </span>
                </div>

                {/* Horizontal Windowed Program Track */}
                <div className="epg-programs-container" style={{ position: 'relative', width: 24 * 60 * PIXELS_PER_MINUTE, height: '100%' }}>
                  {programmes.map((prog, idx) => {
                    const bounds = calculateProgramBounds(prog);
                    if (!bounds) return null;

                    const titleStr = prog.title ? prog.title : t('epg.noEpg', 'Sem programação');

                    return (
                      <div
                        key={idx}
                        className={`epg-program ${bounds.isNow ? 'now-playing' : ''} ${bounds.isPast && prog.has_archive === 1 ? 'has-archive' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${bounds.left}px`,
                          width: `${bounds.width}px`,
                          top: 4,
                          bottom: 4,
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 12,
                          cursor: (bounds.isNow || (bounds.isPast && prog.has_archive === 1)) ? 'pointer' : 'default',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: bounds.isNow ? 'rgba(76, 201, 240, 0.25)' : bounds.isPast ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                          color: bounds.isNow ? '#4cc9f0' : '#e2e8f0',
                          transition: 'background 0.15s ease'
                        }}
                        onClick={() => handleProgramClick(streamId, stream.name, prog, bounds)}
                        title={`${titleStr}\n${prog.start} - ${prog.end}${bounds.isPast && prog.has_archive ? '\n(Gravador/Catch-up)' : ''}`}
                      >
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleStr}</div>
                        <div style={{ fontSize: 10, opacity: 0.75 }}>{prog.start} - {prog.end}</div>
                      </div>
                    );
                  })}
                  {programmes.length === 0 && (
                    <div style={{ position: 'absolute', left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 16, color: '#64748b', fontSize: 12 }}>
                      {t('epg.noEpg', 'Sem programação')}
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
