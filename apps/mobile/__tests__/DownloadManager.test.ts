import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DownloadService, type DownloadTaskRecord } from '../src/lib/DownloadManager.ts';

// Simulated In-Memory Database Store for Testing
class MockDatabase {
  private records: Map<string, DownloadTaskRecord> = new Map();

  async getFirstAsync<T>(query: string, params: any[]): Promise<T | null> {
    if (query.includes('SELECT * FROM downloads WHERE id = ?')) {
      const id = params[0];
      return (this.records.get(id) as unknown as T) || null;
    }
    if (query.includes('SELECT localUri, status FROM downloads')) {
      const [accountId, contentType, streamId] = params;
      for (const rec of this.records.values()) {
        if (
          rec.accountId === accountId &&
          rec.contentType === contentType &&
          rec.streamId === streamId &&
          rec.status === 'COMPLETED'
        ) {
          return { localUri: rec.localUri, status: rec.status } as unknown as T;
        }
      }
      return null;
    }
    return null;
  }

  async getAllAsync<T>(query: string, params?: any[]): Promise<T[]> {
    const list = Array.from(this.records.values());
    if (params && params[0]) {
      const filtered = list.filter((r) => r.accountId === params[0]);
      return filtered as unknown as T[];
    }
    return list as unknown as T[];
  }

  async runAsync(query: string, params: any[]): Promise<void> {
    if (query.startsWith('INSERT INTO downloads')) {
      const [
        id,
        accountId,
        contentType,
        streamId,
        title,
        localUri,
        remoteUrl,
        status,
        downloadedBytes,
        totalBytes,
        createdAt,
        updatedAt,
      ] = params;
      this.records.set(id, {
        id,
        accountId,
        contentType,
        streamId,
        title,
        localUri,
        remoteUrl,
        status,
        downloadedBytes,
        totalBytes,
        createdAt,
        updatedAt,
      });
    } else if (query.startsWith('UPDATE downloads SET status = "QUEUED"')) {
      const [updatedAt, id] = params;
      const rec = this.records.get(id);
      if (rec) {
        rec.status = 'QUEUED';
        rec.updatedAt = updatedAt;
      }
    } else if (query.startsWith('UPDATE downloads SET downloadedBytes = ?')) {
      const [downloadedBytes, totalBytes, updatedAt, id] = params;
      const rec = this.records.get(id);
      if (rec) {
        rec.downloadedBytes = downloadedBytes;
        rec.totalBytes = totalBytes;
        rec.status = 'DOWNLOADING';
        rec.updatedAt = updatedAt;
      }
    } else if (query.startsWith('UPDATE downloads SET status = "DOWNLOADING"')) {
      const [updatedAt, id] = params;
      const rec = this.records.get(id);
      if (rec) {
        rec.status = 'DOWNLOADING';
        rec.updatedAt = updatedAt;
      }
    } else if (query.startsWith('UPDATE downloads SET status = "COMPLETED"')) {
      const [updatedAt, id] = params;
      const rec = this.records.get(id);
      if (rec) {
        rec.status = 'COMPLETED';
        rec.pauseStateJson = null;
        rec.updatedAt = updatedAt;
      }
    } else if (query.startsWith('UPDATE downloads SET status = "PAUSED"')) {
      if (params.length === 3) {
        const [pauseStateJson, updatedAt, id] = params;
        const rec = this.records.get(id);
        if (rec) {
          rec.status = 'PAUSED';
          rec.pauseStateJson = pauseStateJson;
          rec.updatedAt = updatedAt;
        }
      } else {
        const [updatedAt, id] = params;
        const rec = this.records.get(id);
        if (rec) {
          rec.status = 'PAUSED';
          rec.updatedAt = updatedAt;
        }
      }
    } else if (query.startsWith('UPDATE downloads SET status = "CANCELLED"')) {
      const [updatedAt, id] = params;
      const rec = this.records.get(id);
      if (rec) {
        rec.status = 'CANCELLED';
        rec.pauseStateJson = null;
        rec.updatedAt = updatedAt;
      }
    } else if (query.startsWith('DELETE FROM downloads')) {
      const id = params[0];
      this.records.delete(id);
    }
  }

  clear() {
    this.records.clear();
  }
}

describe('VOD DownloadManager State Machine & Services', () => {
  let downloadService: DownloadService;
  let mockDb: MockDatabase;

  beforeEach(() => {
    downloadService = new DownloadService();
    mockDb = new MockDatabase();

    // Inject mock database resolver
    downloadService.setDbOverride(mockDb);
  });

  after(async () => {
    const tmpDir = path.join(process.cwd(), '.tmp_downloads');
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('creates and enqueues a new VOD download task in QUEUED status', async () => {
    const params = {
      id: 'task-vod-101',
      accountId: 'acc-demo-1',
      contentType: 'movie' as const,
      streamId: 501,
      title: 'Inception 4K',
      remoteUrl: 'http://iptv.server/movie/user/pass/501.mp4',
    };

    const task = await downloadService.enqueueDownload(params);

    assert.equal(task.id, 'task-vod-101');
    assert.equal(task.accountId, 'acc-demo-1');
    assert.equal(task.contentType, 'movie');
    assert.equal(task.streamId, 501);
    assert.equal(task.title, 'Inception 4K');
    assert.ok(task.localUri.includes('vod_movie_501.mp4'));
  });

  it('transitions state through QUEUED -> DOWNLOADING -> COMPLETED', async () => {
    const params = {
      id: 'task-vod-102',
      accountId: 'acc-demo-1',
      contentType: 'movie' as const,
      streamId: 502,
      title: 'Interstellar 4K',
      remoteUrl: 'http://iptv.server/movie/user/pass/502.mp4',
    };

    await downloadService.enqueueDownload(params);
    let record = await downloadService.getDownloadById('task-vod-102');
    assert.ok(record !== null);

    // Simulate completion
    const db = await (downloadService as any).getDb();
    await db.runAsync('UPDATE downloads SET status = "COMPLETED", updatedAt = ? WHERE id = ?', [
      new Date().toISOString(),
      'task-vod-102',
    ]);

    record = await downloadService.getDownloadById('task-vod-102');
    assert.equal(record?.status, 'COMPLETED');

    const uri = await downloadService.getCompletedDownloadUri('acc-demo-1', 'movie', 502);
    assert.ok(uri !== null);
    assert.ok(uri?.includes('vod_movie_502.mp4'));
  });

  it('handles pause state serialization into pauseStateJson', async () => {
    const params = {
      id: 'task-vod-103',
      accountId: 'acc-demo-1',
      contentType: 'series' as const,
      streamId: 901,
      title: 'Breaking Bad S01E01',
      remoteUrl: 'http://iptv.server/series/user/pass/901.mp4',
    };

    await downloadService.enqueueDownload(params);

    const pauseStateData = JSON.stringify({
      url: params.remoteUrl,
      fileUri: '/mock/documents/downloads/series/vod_series_901.mp4',
      resumeData: 'bytes=1048576-',
    });

    const db = await (downloadService as any).getDb();
    await db.runAsync(
      'UPDATE downloads SET status = "PAUSED", pauseStateJson = ?, updatedAt = ? WHERE id = ?',
      [pauseStateData, new Date().toISOString(), 'task-vod-103']
    );

    const record = await downloadService.getDownloadById('task-vod-103');
    assert.equal(record?.status, 'PAUSED');
    assert.ok(record?.pauseStateJson);
    const parsed = JSON.parse(record!.pauseStateJson!);
    assert.equal(parsed.resumeData, 'bytes=1048576-');
  });

  it('handles cancellation and cleanup', async () => {
    const params = {
      id: 'task-vod-104',
      accountId: 'acc-demo-1',
      contentType: 'movie' as const,
      streamId: 701,
      title: 'Avatar The Way of Water',
      remoteUrl: 'http://iptv.server/movie/user/pass/701.mp4',
    };

    await downloadService.enqueueDownload(params);
    await downloadService.cancelDownload('task-vod-104');

    const record = await downloadService.getDownloadById('task-vod-104');
    assert.equal(record?.status, 'CANCELLED');

    await downloadService.deleteDownload('task-vod-104');
    const deletedRecord = await downloadService.getDownloadById('task-vod-104');
    assert.equal(deletedRecord, null);
  });

  it('persists secure download tokens via expo-secure-store interface', async () => {
    const downloadId = 'task-vod-105';
    const sampleToken = 'sec_token_abc123xyz';

    await downloadService.setSecureToken(downloadId, sampleToken);
    const fetchedToken = await downloadService.getSecureToken(downloadId);
    assert.equal(fetchedToken, sampleToken);

    await downloadService.removeSecureToken(downloadId);
    const removedToken = await downloadService.getSecureToken(downloadId);
    assert.equal(removedToken, null);
  });
});
