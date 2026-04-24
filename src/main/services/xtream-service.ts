import type {
  Account,
  Category,
  ContentType,
  EpgProgramme,
  Episode,
  SeriesInfoResponse,
  StreamItem,
  XtreamAuthResponse
} from '../types';
import { SettingsService } from './settings-service';

export class XtreamService {
  private settingsService = new SettingsService();

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
    const data = await this.request<{ epg_listings?: EpgProgramme[] }>(account, {
      username: account.username,
      password: account.password,
      action: 'get_short_epg',
      stream_id: String(streamId),
      limit: String(limit)
    });

    return data.epg_listings ?? [];
  }

  buildStreamCandidates(account: Account, contentType: ContentType, streamId: number, extension?: string) {
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

  async resolveBestStreamUrl(account: Account, contentType: ContentType, streamId: number, extension?: string) {
    const timeoutMs = this.settingsService.get().stream.probeTimeoutMs;
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
