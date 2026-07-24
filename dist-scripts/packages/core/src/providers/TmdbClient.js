"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TmdbClient = void 0;
class TmdbClient {
    constructor(fetchFn) {
        this.fetchFn = fetchFn;
        this.cache = new Map();
    }
    getMockInfo(name) {
        const cleanName = name.replace(/\(\d{4}\)/g, '').trim();
        return {
            posterPath: 'https://image.tmdb.org/t/p/w500/mock_poster.jpg',
            backdropPath: 'https://image.tmdb.org/t/p/w1280/mock_backdrop.jpg',
            overview: `Sinopse simulada para ${cleanName}`,
            voteAverage: 8.5,
            releaseDate: '2025-01-01'
        };
    }
    async fetchInfo(name, type, apiKey) {
        if (process.env.TMDB_MOCK === 'true') {
            return this.getMockInfo(name);
        }
        if (!apiKey)
            return null;
        // Clean up the name for better search results (remove years in parenthesis, etc.)
        const cleanName = name.replace(/\(\d{4}\)/g, '').trim();
        const cacheKey = `${type}:${cleanName}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey) || null;
        }
        try {
            const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
            const url = `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(cleanName)}&language=pt-BR&page=1`;
            const response = await this.fetchFn(url, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    accept: 'application/json'
                }
            });
            if (!response.ok) {
                if (response.status !== 401) {
                    console.warn(`TMDB API Error: ${response.statusText} (${response.status})`);
                }
                return null;
            }
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                // Take the first result
                const result = data.results[0];
                const info = {
                    posterPath: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : undefined,
                    backdropPath: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : undefined,
                    overview: result.overview,
                    voteAverage: result.vote_average,
                    releaseDate: type === 'movie' ? result.release_date : result.first_air_date
                };
                this.cache.set(cacheKey, info);
                return info;
            }
            return null;
        }
        catch (error) {
            console.error('Failed to fetch TMDB info:', error);
            return null;
        }
    }
}
exports.TmdbClient = TmdbClient;
