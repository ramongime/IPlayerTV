/**
 * Parses an M3U URL into Xtream credentials.
 * 
 * Most IPTV M3U URLs follow this pattern:
 *   http://server:port/get.php?username=USER&password=PASS&type=m3u_plus&output=ts
 * 
 * This parser extracts server, username and password from such URLs.
 */
export function parseM3uUrl(url: string): { server: string; username: string; password: string; output: 'm3u8' | 'ts' } | null {
  try {
    const parsed = new URL(url.trim());

    const username = parsed.searchParams.get('username');
    const password = parsed.searchParams.get('password');
    const outputParam = parsed.searchParams.get('output') || parsed.searchParams.get('type');

    if (!username || !password) {
      return null;
    }

    // Rebuild the server base URL (protocol + host + port)
    const server = `${parsed.protocol}//${parsed.host}`;
    const output: 'm3u8' | 'ts' = outputParam === 'ts' ? 'ts' : 'm3u8';

    return { server, username, password, output };
  } catch {
    return null;
  }
}
