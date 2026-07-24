"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XtreamProvider = void 0;
const base64_1 = require("../utils/base64");
class XtreamProvider {
    constructor(getTimeoutMs) {
        this.getTimeoutMs = getTimeoutMs;
    }
    async authenticate(account) {
        const data = await this.request(account, {
            username: account.username,
            password: account.password
        });
        return {
            ok: data.user_info?.auth === 1,
            data
        };
    }
    async categories(account, contentType) {
        const actionMap = {
            live: 'get_live_categories',
            movie: 'get_vod_categories',
            series: 'get_series_categories'
        };
        return this.request(account, {
            username: account.username,
            password: account.password,
            action: actionMap[contentType]
        });
    }
    async streams(account, contentType, categoryId) {
        const actionMap = {
            live: 'get_live_streams',
            movie: 'get_vod_streams',
            series: 'get_series'
        };
        const params = {
            username: account.username,
            password: account.password,
            action: actionMap[contentType]
        };
        if (categoryId && categoryId !== 'all') {
            params.category_id = categoryId;
        }
        const data = await this.request(account, params);
        if (!Array.isArray(data))
            return [];
        // Trim unused fields to reduce IPC payload size
        return data.map(item => ({
            num: item.num,
            name: item.name,
            stream_type: item.stream_type,
            stream_id: item.stream_id,
            stream_icon: item.stream_icon,
            epg_channel_id: item.epg_channel_id,
            added: item.added,
            category_id: item.category_id,
            custom_sid: item.custom_sid,
            tv_archive: item.tv_archive,
            direct_source: item.direct_source,
            tv_archive_duration: item.tv_archive_duration,
            rating: item.rating,
            rating_5based: item.rating_5based,
            container_extension: item.container_extension,
            series_id: item.series_id,
            cover: item.cover,
            plot: item.plot,
            cast: item.cast,
            director: item.director,
            genre: item.genre,
            releaseDate: item.releaseDate,
            episode_run_time: item.episode_run_time,
            backdrop_path: item.backdrop_path
        }));
    }
    async seriesEpisodes(account, seriesId) {
        const data = await this.request(account, {
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
    async shortEpg(account, streamId, limit = 10) {
        const data = await this.request(account, {
            username: account.username,
            password: account.password,
            action: 'get_short_epg',
            stream_id: String(streamId),
            limit: String(limit)
        });
        const listings = (data.epg_listings ?? []).map((raw) => this.decodeEpgListing(raw));
        if (listings.length > 0)
            return listings;
        // Some panels return an empty short_epg but still expose the full grid via
        // get_simple_data_table. Fall back to it, keeping only programmes that
        // haven't ended yet so a stale table doesn't masquerade as a live EPG.
        try {
            const table = await this.getEpgTable(account, String(streamId));
            const nowSec = Math.floor(Date.now() / 1000);
            const programmes = table[String(streamId)] ?? Object.values(table)[0] ?? [];
            return programmes
                .filter((prog) => (prog.stop_timestamp ?? 0) >= nowSec)
                .slice(0, limit);
        }
        catch {
            return [];
        }
    }
    async getEpgTable(account, streamIds) {
        const data = await this.request(account, {
            username: account.username,
            password: account.password,
            action: 'get_simple_data_table',
            stream_id: streamIds
        });
        const result = {};
        // Panels dedupe streams sharing the same EPG source, so we also expose each
        // list under its programmes' channel_id — callers can then fall back to the
        // stream's epg_channel_id when its stream_id is missing from the response.
        const addListings = (key, rawListings) => {
            const decoded = rawListings.map((raw) => this.decodeEpgListing(raw));
            result[key] = decoded;
            const channelId = rawListings[0]?.channel_id;
            if (typeof channelId === 'string' && channelId && !(channelId in result)) {
                result[channelId] = decoded;
            }
        };
        if (data && Array.isArray(data.epg_listings)) {
            const first = data.epg_listings[0];
            if (first && first.id && Array.isArray(first.epg_listings)) {
                // Array of channels, each with nested listings
                for (const channel of data.epg_listings) {
                    if (channel && channel.id && Array.isArray(channel.epg_listings)) {
                        addListings(String(channel.id), channel.epg_listings);
                    }
                }
            }
            else if (data.epg_listings.length > 0) {
                // Flat array of programmes (single-stream request shape)
                addListings(streamIds, data.epg_listings);
            }
        }
        else if (data && typeof data.epg_listings === 'object' && data.epg_listings !== null) {
            // Object keyed by stream id (comma-separated request shape)
            for (const [id, listings] of Object.entries(data.epg_listings)) {
                if (Array.isArray(listings) && listings.length > 0) {
                    addListings(id, listings);
                }
            }
        }
        return result;
    }
    async nowPlaying(account, streamIds) {
        const result = {};
        const BATCH_SIZE = 50;
        const CONCURRENCY = 3;
        const fetchBatch = async (batch) => {
            const streamIdsStr = batch.join(',');
            try {
                const epgData = await this.getEpgTable(account, streamIdsStr);
                const currentTime = Math.floor(Date.now() / 1000);
                for (const [streamId, programmes] of Object.entries(epgData)) {
                    const idNum = Number(streamId);
                    if (!Number.isFinite(idNum))
                        continue;
                    const now = programmes.find(prog => {
                        if (prog.start_timestamp && prog.stop_timestamp) {
                            return prog.start_timestamp <= currentTime && prog.stop_timestamp > currentTime;
                        }
                        return false;
                    });
                    if (now?.title) {
                        result[idNum] = now.title;
                    }
                }
            }
            catch (err) {
                console.error('Error fetching nowPlaying batch with getEpgTable', err);
            }
        };
        const batches = [];
        for (let i = 0; i < streamIds.length; i += BATCH_SIZE) {
            batches.push(streamIds.slice(i, i + BATCH_SIZE));
        }
        for (let i = 0; i < batches.length; i += CONCURRENCY) {
            const currentBatches = batches.slice(i, i + CONCURRENCY);
            await Promise.all(currentBatches.map(fetchBatch));
        }
        return result;
    }
    formatEpgTime(value) {
        if (!value)
            return '';
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
    decodeEpgListing(raw) {
        let startTs = Number(raw.start_timestamp) || 0;
        let stopTs = Number(raw.stop_timestamp) || 0;
        if (!startTs && typeof raw.start === 'string') {
            const parsed = new Date(raw.start.replace(' ', 'T')).getTime();
            if (!isNaN(parsed))
                startTs = parsed / 1000;
        }
        if (!stopTs && typeof raw.end === 'string') {
            const parsed = new Date(raw.end.replace(' ', 'T')).getTime();
            if (!isNaN(parsed))
                stopTs = parsed / 1000;
        }
        if (startTs && stopTs && startTs > stopTs) {
            const temp = startTs;
            startTs = stopTs;
            stopTs = temp;
        }
        return {
            title: (0, base64_1.decodeBase64)(raw.title) || undefined,
            description: (0, base64_1.decodeBase64)(raw.description) || undefined,
            start: startTs ? this.formatEpgTime(startTs) : this.formatEpgTime(raw.start),
            start_raw: typeof raw.start === 'string' ? raw.start : undefined,
            start_timestamp: startTs || undefined,
            end: stopTs ? this.formatEpgTime(stopTs) : this.formatEpgTime(raw.end),
            end_raw: typeof raw.end === 'string' ? raw.end : undefined,
            stop_timestamp: stopTs || undefined,
            now_playing: typeof raw.now_playing === 'string' ? raw.now_playing : undefined,
            has_archive: typeof raw.has_archive === 'number' ? raw.has_archive : undefined
        };
    }
    buildStreamCandidates(account, contentType, streamId, extension, forceExtension) {
        const server = account.server.replace(/\/$/, '');
        let exts;
        if (forceExtension && extension) {
            exts = [extension];
        }
        else {
            exts = contentType === 'live'
                ? Array.from(new Set([account.output, 'm3u8', 'ts']))
                : Array.from(new Set([extension || 'mp4', 'mkv', 'mp4']));
        }
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
    resolveCatchupUrl(account, streamId, startRaw, durationMinutes, extension) {
        const server = account.server.replace(/\/$/, '');
        const ext = extension || 'm3u8';
        // Parse the start time "YYYY-MM-DD HH:MM:SS" into "YYYY-MM-DD:HH-MM"
        const dateObj = new Date(startRaw.replace(' ', 'T'));
        const pad = (n) => String(n).padStart(2, '0');
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
    async resolveBestStreamUrl(account, contentType, streamId, extension, forceExtension) {
        const timeoutMs = this.getTimeoutMs();
        const candidates = this.buildStreamCandidates(account, contentType, streamId, extension, forceExtension);
        for (const url of candidates) {
            const ok = await this.canOpen(url, timeoutMs, account.userAgent);
            if (ok) {
                return url;
            }
        }
        return candidates[0];
    }
    async canOpen(url, timeoutMs, userAgent) {
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
        }
        catch {
            return false;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async request(account, params) {
        const url = new URL('/player_api.php', account.server.endsWith('/') ? account.server : `${account.server}/`);
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        const response = await fetch(url.toString(), {
            headers: account.userAgent ? { 'User-Agent': account.userAgent } : undefined
        });
        if (!response.ok) {
            throw new Error(`Falha ao buscar dados do servidor: ${response.status}`);
        }
        return response.json();
    }
}
exports.XtreamProvider = XtreamProvider;
