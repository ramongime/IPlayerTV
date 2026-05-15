import { net } from 'electron';
import { TmdbInfo } from '@shared/domain';

export class TmdbProvider {
  private cache: Map<string, TmdbInfo> = new Map();

  constructor() {}

  async fetchInfo(name: string, type: 'movie' | 'series', apiKey: string): Promise<TmdbInfo | undefined> {
    if (!apiKey) return undefined;

    // Clean up the name for better search results (remove years in parenthesis, etc.)
    const cleanName = name.replace(/\(\d{4}\)/g, '').trim();
    const cacheKey = `${type}:${cleanName}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
      const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(cleanName)}&language=pt-BR&page=1`;

      const response = await net.fetch(url);
      if (!response.ok) {
        console.error(`TMDB API Error: ${response.statusText}`);
        return undefined;
      }

      const data: any = await response.json();
      if (data.results && data.results.length > 0) {
        // Take the first result
        const result = data.results[0];

        const info: TmdbInfo = {
          posterPath: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : undefined,
          backdropPath: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : undefined,
          overview: result.overview,
          voteAverage: result.vote_average,
          releaseDate: type === 'movie' ? result.release_date : result.first_air_date
        };

        this.cache.set(cacheKey, info);
        return info;
      }

      return undefined;
    } catch (error) {
      console.error('Failed to fetch TMDB info:', error);
      return undefined;
    }
  }
}
