export type ContentType = 'live' | 'movie' | 'series';
export type ShelfView = 'catalog' | 'favorites' | 'history';

export interface Account {
  id: string;
  name: string;
  server: string;
  username: string;
  password: string;
  output: 'm3u8' | 'ts';
  player: 'vlc' | 'mpv' | 'browser' | 'internal';
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface StreamItem {
  stream_id?: number;
  series_id?: number;
  name: string;
  category_id?: string;
  stream_icon?: string;
  container_extension?: string;
  epg_channel_id?: string;
  added?: string;
  stream_type?: string;
  rating?: string;
  plot?: string;
  cover?: string;
  releaseDate?: string;
  last_modified?: string;
}

export interface Episode {
  id: number;
  title: string;
  container_extension?: string;
  season: number;
  episode_num: number;
  info?: Record<string, unknown>;
}

export interface SeriesInfoResponse {
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
  };
  episodes?: Record<string, Array<{
    id: string | number;
    title?: string;
    container_extension?: string;
    episode_num?: number;
    info?: Record<string, unknown>;
  }>>;
}

export interface EpgProgramme {
  title?: string;
  description?: string;
  start?: string;
  start_raw?: string;
  end?: string;
  end_raw?: string;
  now_playing?: string;
  has_archive?: number;
}

export type NowPlayingMap = Record<number, string>;


export interface Favorite {
  accountId: string;
  contentType: ContentType;
  streamId: number;
  name: string;
  icon?: string;
  createdAt: string;
}

export interface HistoryItem {
  accountId: string;
  contentType: ContentType;
  streamId: number;
  name: string;
  streamUrl: string;
  playedAt: string;
}

export interface XtreamAuthResponse {
  user_info?: {
    auth: number;
    status: string;
    username: string;
    password: string;
    exp_date?: string;
    active_cons?: number;
    max_connections?: string;
    allowed_output_formats?: string[];
  };
  server_info?: {
    url?: string;
    server_protocol?: string;
    timezone?: string;
  };
}
