import assert from 'node:assert';
import { performance } from 'node:perf_hooks';

// 1. EPG Horizontal Windowing Benchmark
function benchmarkEpgWindowing() {
  console.log('--- BENCHMARKING EPG HORIZONTAL WINDOWING ---');

  const PIXELS_PER_MINUTE = 5;
  const BUFFER_MINUTES = 60;
  const containerWidth = 1200;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Generate 50 programmes spanning 24 hours
  const mockProgrammes = Array.from({ length: 50 }, (_, i) => {
    const sH = Math.floor(i / 2);
    const sM = (i % 2) * 30;
    const eH = sH + (sM === 30 ? 1 : 0);
    const eM = sM === 30 ? 0 : 30;
    const startRaw = `2026-07-23 ${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`;
    const endRaw = `2026-07-23 ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00`;
    return {
      title: `Show ${i}`,
      start_raw: startRaw,
      end_raw: endRaw,
      has_archive: i % 2 === 0 ? 1 : 0
    };
  });

  const scrollTicks = 1000;
  const tickTimes: number[] = [];

  for (let tick = 0; tick < scrollTicks; tick++) {
    const scrollLeft = (tick * 10) % 5000;
    const t0 = performance.now();

    // Window calculation logic identical to VirtualizedEpgGrid.tsx
    const startMins = Math.max(0, Math.floor(scrollLeft / PIXELS_PER_MINUTE) - BUFFER_MINUTES);
    const endMins = Math.ceil((scrollLeft + containerWidth) / PIXELS_PER_MINUTE) + BUFFER_MINUTES;

    const visibleProgrammes = [];
    for (const prog of mockProgrammes) {
      const pStart = new Date(prog.start_raw.replace(' ', 'T')).getTime();
      const pEnd = new Date(prog.end_raw.replace(' ', 'T')).getTime();
      const pStartMins = (pStart - startOfDay.getTime()) / 60000;
      const pEndMins = (pEnd - startOfDay.getTime()) / 60000;

      if (!(pEndMins < startMins || pStartMins > endMins)) {
        visibleProgrammes.push(prog);
      }
    }

    const t1 = performance.now();
    tickTimes.push(t1 - t0);
  }

  const avgTickMs = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
  const maxTickMs = Math.max(...tickTimes);

  console.log(`EPG Scroll Tick Average Latency: ${avgTickMs.toFixed(4)} ms`);
  console.log(`EPG Scroll Tick Peak Latency: ${maxTickMs.toFixed(4)} ms`);

  assert.ok(avgTickMs < 5.0, `EPG average scroll tick (${avgTickMs}ms) must be < 5ms`);
  console.log('✓ EPG Horizontal Windowing performance requirement (< 5ms per tick) PASSED.');
}

// 2. Global Search Benchmark
function benchmarkGlobalSearch() {
  console.log('\n--- BENCHMARKING GLOBAL SEARCH LATENCY ---');

  // Generate dataset of 50,000 streams (15k live, 20k movies, 15k series)
  const generateStreams = (count: number, prefix: string) => {
    return Array.from({ length: count }, (_, i) => ({
      stream_id: i + 1,
      name: `${prefix} ${i % 100 === 0 ? 'Matrix Reloaded Ultra HD' : i % 50 === 0 ? 'Action Special Thriller' : 'Channel Stream Content'} #${i}`,
      category_id: (i % 20) + 1
    }));
  };

  const live = generateStreams(15000, 'Live TV');
  const movie = generateStreams(20000, 'Movie VOD');
  const series = generateStreams(15000, 'Series Episode');

  const queries = ['matrix', 'action', 'channel', 'ultra', 'stream', 'nonexistentquery123'];
  const queryLatencies: number[] = [];

  for (const q of queries) {
    const t0 = performance.now();
    const cleanQuery = q.trim().toLowerCase();

    const liveMatches = live.filter(s => s.name.toLowerCase().includes(cleanQuery)).slice(0, 50);
    const movieMatches = movie.filter(s => s.name.toLowerCase().includes(cleanQuery)).slice(0, 50);
    const seriesMatches = series.filter(s => s.name.toLowerCase().includes(cleanQuery)).slice(0, 50);
    const total = liveMatches.length + movieMatches.length + seriesMatches.length;

    const t1 = performance.now();
    const latency = t1 - t0;
    queryLatencies.push(latency);
    console.log(`Query "${q}" returned ${total} matches in ${latency.toFixed(2)} ms`);
  }

  const avgSearchMs = queryLatencies.reduce((a, b) => a + b, 0) / queryLatencies.length;
  const maxSearchMs = Math.max(...queryLatencies);

  console.log(`Global Search Average Query Latency: ${avgSearchMs.toFixed(2)} ms`);
  console.log(`Global Search Peak Query Latency: ${maxSearchMs.toFixed(2)} ms`);

  assert.ok(maxSearchMs < 2000, `Global search max latency (${maxSearchMs}ms) must be < 2000ms (2s)`);
  console.log('✓ Global Search performance requirement (< 2s response) PASSED.');
}

function main() {
  benchmarkEpgWindowing();
  benchmarkGlobalSearch();
  console.log('\nALL PERFORMANCE BENCHMARKS PASSED.');
}

main();
