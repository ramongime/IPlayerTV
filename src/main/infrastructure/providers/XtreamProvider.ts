import type { Account, Category, ContentType, EpgProgramme, Episode, NowPlayingMap, SeriesInfoResponse, StreamItem, XtreamAuthResponse } from '@shared/domain';
import type { IXtreamProvider } from '../../core/services/IXtreamProvider';

export class XtreamProvider implements IXtreamProvider {
  constructor(private getTimeoutMs: () => number) {}

  async authenticate(account: Pick<Account, 'server' | 'username' | 'password' | 'userAgent'>) {
    const data = await this.request<XtreamAuthResponse>(account, {
      username: account.username,
      password: account.password
    });

    return {
      ok: data.user_info?.auth === 1,
      data
    };
  }

  async categories(account: Account, contentType: ContentType): Promise<Category[]> {
    const actionMap: Record<ContentType, string> = {
      live: 'get_live_categories',
      movie: 'get_vod_categories',
      series: 'get_series_categories'
    };

    return this.request<Category[]>(account, {
      username: account.username,
      password: account.password,
      action: actionMap[contentType]
    });
  }

  async streams(account: Account, contentType: ContentType, categoryId?: string): Promise<StreamItem[]> {
    const actionMap: Record<ContentType, string> = {
      live: 'get_live_streams',
      movie: 'get_vod_streams',
      series: 'get_series'
    };

    const params: Record<string, string> = {
      username: account.username,
      password: account.password,
      action: actionMap[contentType]
    };

    if (categoryId && categoryId !== 'all') {
      params.category_id = categoryId;
    }

    return this.request<StreamItem[]>(account, params);
  }

  async seriesEpisodes(account: Account, seriesId: number): Promise<Episode[]> {
    const data = await this.request<SeriesInfoResponse>(account, {
      username: account.username,
      password: account.password,
      action: 'get_series_info',
      series_id: String(seriesId)
    });

    const episodes = data.episodes ?? {};
    return Object.entries(episodes).flatMap(([season, seasonEpisodes]) => {
      return seasonEpisodes.map((episode, index) => ({
        id: Number(episode.id),
        title: episode.title || `Episódio ${episode.episode_num ?? index + 1}`,
        container_extension: episode.container_extension || 'mp4',
        season: Number(season),
        episode_num: episode.episode_num ?? index + 1,
        info: episode.info
      }));
    }).sort((a, b) => a.season - b.season || a.episode_num - b.episode_num);
  }

  async shortEpg(account: Account, streamId: number, limit = 10): Promise<EpgProgramme[]> {
    const data = await this.request<{ epg_listings?: Array<Record<string, unknown>> }>(account, {
      username: account.username,
      password: account.password,
      action: 'get_short_epg',
      stream_id: String(streamId),
      limit: String(limit)
    });

    return (data.epg_listings ?? []).map((raw) => this.decodeEpgListing(raw));
  }

  async getEpgTable(account: Account, streamIds: string): Promise<Record<string, EpgProgramme[]>> {
    const data = await this.request<any>(account, {
      username: account.username,
      password: account.password,
      action: 'get_simple_data_table',
      stream_id: streamIds
    });

    const result: Record<string, EpgProgramme[]> = {};

    if (data && Array.isArray(data.epg_listings)) {
      for (const channel of data.epg_listings) {
        if (channel && channel.id && Array.isArray(channel.epg_listings)) {
          result[channel.id] = channel.epg_listings.map((raw: any) => this.decodeEpgListing(raw));
        }
      }
    } else if (data && typeof data.epg_listings === 'object') {
      for (const [id, listings] of Object.entries(data.epg_listings)) {
        if (Array.isArray(listings)) {
          result[id] = listings.map((raw: any) => this.decodeEpgListing(raw));
        }
      }
    }

    return result;
  }

  async nowPlaying(account: Account, streamIds: number[]): Promise<NowPlayingMap> {
    const result: NowPlayingMap = {};
    const CONCURRENCY = 5;

    for (let i = 0; i < streamIds.length; i += CONCURRENCY) {
      const batch = streamIds.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (streamId) => {
          const items = await this.shortEpg(account, streamId, 2);
          // Find the programme that is currently airing or the first one
          const now = items.length > 0 ? items[0] : undefined;
          if (now?.title) {
            result[streamId] = now.title;
          }
        })
      );
    }

    return result;
  }

  private decodeBase64(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) return '';
    try {
      return Buffer.from(value, 'base64').toString('utf-8');
    } catch {
      return String(value);
    }
  }

  private formatEpgTime(value: unknown): string {
    if (!value) return '';
    // The API may return a date string like "2026-05-04 21:00:00" or an epoch timestamp
    const str = String(value);
    // Try parsing as a date string first
    const asDate = new Date(str.replace(' ', 'T'));
    if (!isNaN(asDate.getTime())) {
      return asDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    // Try as epoch seconds
    const epoch = Number(str);
    if (!isNaN(epoch) && epoch > 1000000000) {
      const d = new Date(epoch * 1000);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return str;
  }

  private decodeEpgListing(raw: Record<string, unknown>): EpgProgramme {
    let startTs = Number(raw.start_timestamp) || 0;
    let stopTs = Number(raw.stop_timestamp) || 0;

    if (!startTs && typeof raw.start === 'string') {
      const parsed = new Date(raw.start.replace(' ', 'T')).getTime();
      if (!isNaN(parsed)) startTs = parsed / 1000;
    }
    if (!stopTs && typeof raw.end === 'string') {
      const parsed = new Date(raw.end.replace(' ', 'T')).getTime();
      if (!isNaN(parsed)) stopTs = parsed / 1000;
    }

    if (startTs && stopTs && startTs > stopTs) {
      const temp = startTs;
      startTs = stopTs;
      stopTs = temp;
    }

    return {
      title: this.decodeBase64(raw.title) || undefined,
      description: this.decodeBase64(raw.description) || undefined,
      start: startTs ? this.formatEpgTime(startTs) : this.formatEpgTime(raw.start),
      start_raw: typeof raw.start === 'string' ? raw.start : undefined,
      end: stopTs ? this.formatEpgTime(stopTs) : this.formatEpgTime(raw.end),
      end_raw: typeof raw.end === 'string' ? raw.end : undefined,
      now_playing: typeof raw.now_playing === 'string' ? raw.now_playing : undefined,
      has_archive: typeof raw.has_archive === 'number' ? raw.has_archive : undefined
    };
  }

  private buildStreamCandidates(account: Account, contentType: ContentType, streamId: number, extension?: string) {
    const server = account.server.replace(/\/$/, '');
    const exts = contentType === 'live'
      ? Array.from(new Set([account.output, 'm3u8', 'ts']))
      : Array.from(new Set([extension || 'mp4', 'mkv', 'mp4']));

    if (contentType === 'live') {
      return exts.flatMap((ext) => [
        `${server}/live/${account.username}/${account.password}/${streamId}.${ext}`,
        `${server}/${account.username}/${account.password}/${streamId}.${ext}`
      ]);
    }

    if (contentType === 'movie') {
      return exts.map((ext) => `${server}/movie/${account.username}/${account.password}/${streamId}.${ext}`);
    }

    return exts.map((ext) => `${server}/series/${account.username}/${account.password}/${streamId}.${ext}`);
  }

  resolveCatchupUrl(account: Account, streamId: number, startRaw: string, durationMinutes: number, extension?: string) {
    const server = account.server.replace(/\/$/, '');
    const ext = extension || 'm3u8';

    // Parse the start time "YYYY-MM-DD HH:MM:SS" into "YYYY-MM-DD:HH-MM"
    const dateObj = new Date(startRaw.replace(' ', 'T'));
    const pad = (n: number) => String(n).padStart(2, '0');

    let startTime = startRaw; // fallback
    if (!isNaN(dateObj.getTime())) {
      const Y = dateObj.getFullYear();
      const M = pad(dateObj.getMonth() + 1);
      const D = pad(dateObj.getDate());
      const h = pad(dateObj.getHours());
      const m = pad(dateObj.getMinutes());
      startTime = `${Y}-${M}-${D}:${h}-${m}`;
    }

    return `${server}/timeshift/${account.username}/${account.password}/${durationMinutes}/${startTime}/${streamId}.${ext}`;
  }

  async resolveBestStreamUrl(account: Account, contentType: ContentType, streamId: number, extension?: string) {
    const timeoutMs = this.getTimeoutMs();
    const candidates = this.buildStreamCandidates(account, contentType, streamId, extension);

    for (const url of candidates) {
      const ok = await this.canOpen(url, timeoutMs, account.userAgent);
      if (ok) {
        return url;
      }
    }

    return candidates[0];
  }

  private async canOpen(url: string, timeoutMs: number, userAgent?: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
          ...(userAgent ? { 'User-Agent': userAgent } : {})
        },
        signal: controller.signal
      });
      return response.ok || response.status === 206 || response.status === 401 || response.status === 403;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(account: Pick<Account, 'server' | 'userAgent'>, params: Record<string, string>): Promise<T> {
    const url = new URL('/player_api.php', account.server.endsWith('/') ? account.server : `${account.server}/`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url.toString(), {
      headers: account.userAgent ? { 'User-Agent': account.userAgent } : undefined
    });

    if (!response.ok) {
      throw new Error(`Falha ao buscar dados do servidor: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
