import * as FileSystem from './fileSystem';
import * as SecureStore from './secureStore';
import { getDatabase } from './db';

export type DownloadStatus =
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DownloadTaskRecord {
  id: string;
  accountId: string;
  contentType: 'movie' | 'series';
  streamId: number;
  title: string;
  localUri: string;
  remoteUrl: string;
  status: DownloadStatus;
  downloadedBytes: number;
  totalBytes: number;
  pauseStateJson?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueDownloadParams {
  id: string;
  accountId: string;
  contentType: 'movie' | 'series';
  streamId: number;
  title: string;
  remoteUrl: string;
  extension?: string;
}

type DownloadListener = (tasks: DownloadTaskRecord[]) => void;

const SECURE_DOWNLOAD_KEY_PREFIX = 'iplayertv_download_sec_';

export class DownloadService {
  private activeResumables: Map<string, any> = new Map();
  private listeners: Set<DownloadListener> = new Set();
  private dbOverride: any = null;

  private async getDb() {
    if (this.dbOverride) return this.dbOverride;
    return await getDatabase();
  }

  public setDbOverride(db: any) {
    this.dbOverride = db;
  }

  public subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    if (this.listeners.size === 0) return;
    try {
      const downloads = await this.getDownloads();
      this.listeners.forEach((listener) => listener(downloads));
    } catch {}
  }

  /**
   * Save a secure token associated with a download task via expo-secure-store
   */
  async setSecureToken(downloadId: string, token: string): Promise<void> {
    await SecureStore.setItemAsync(`${SECURE_DOWNLOAD_KEY_PREFIX}${downloadId}`, token);
  }

  /**
   * Retrieve secure token associated with a download task via expo-secure-store
   */
  async getSecureToken(downloadId: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`${SECURE_DOWNLOAD_KEY_PREFIX}${downloadId}`);
  }

  /**
   * Delete secure token for a download task
   */
  async removeSecureToken(downloadId: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${SECURE_DOWNLOAD_KEY_PREFIX}${downloadId}`);
  }

  /**
   * Enqueues a new VOD download task and initiates background execution.
   */
  async enqueueDownload(params: EnqueueDownloadParams): Promise<DownloadTaskRecord> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const ext = params.extension || 'mp4';
    const filename = `vod_${params.contentType}_${params.streamId}.${ext}`;
    const baseDir = FileSystem.documentDirectory || '/';
    const localDir = `${baseDir}downloads/${params.contentType}/`;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
    const localUri = `${localDir}${filename}`;

    const existing = await db.getFirstAsync(
      'SELECT * FROM downloads WHERE id = ?',
      [params.id]
    );

    if (existing) {
      if (existing.status === 'DOWNLOADING') {
        return existing;
      }
      // Re-queue existing failed/paused download
      await db.runAsync(
        'UPDATE downloads SET status = "QUEUED", updatedAt = ? WHERE id = ?',
        [now, params.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO downloads (id, accountId, contentType, streamId, title, localUri, remoteUrl, status, downloadedBytes, totalBytes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, 0, ?, ?)`,
        [
          params.id,
          params.accountId,
          params.contentType,
          params.streamId,
          params.title,
          localUri,
          params.remoteUrl,
          now,
          now,
        ]
      );
    }

    await this.notifyListeners();
    this.startDownload(params.id).catch(() => {});

    const record = await this.getDownloadById(params.id);
    return record!;
  }

  /**
   * Starts or resumes an active download task.
   */
  async startDownload(downloadId: string): Promise<void> {
    const db = await this.getDb();
    const record = await db.getFirstAsync(
      'SELECT * FROM downloads WHERE id = ?',
      [downloadId]
    );

    if (!record) {
      throw new Error(`Download task ${downloadId} not found`);
    }

    if (record.status === 'COMPLETED') {
      return;
    }

    const progressCallback = (progress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      db.runAsync(
        'UPDATE downloads SET downloadedBytes = ?, totalBytes = ?, status = "DOWNLOADING", updatedAt = ? WHERE id = ?',
        [totalBytesWritten, totalBytesExpectedToWrite, new Date().toISOString(), downloadId]
      )
        .then(() => this.notifyListeners())
        .catch(() => {});
    };

    let resumable: any;

    if (record.pauseStateJson) {
      try {
        const pauseState = JSON.parse(record.pauseStateJson);
        resumable = FileSystem.createDownloadResumable(
          pauseState.url || record.remoteUrl,
          pauseState.fileUri || record.localUri,
          pauseState.options || {},
          progressCallback,
          pauseState.resumeData
        );
      } catch {
        resumable = FileSystem.createDownloadResumable(
          record.remoteUrl,
          record.localUri,
          {},
          progressCallback
        );
      }
    } else {
      resumable = FileSystem.createDownloadResumable(
        record.remoteUrl,
        record.localUri,
        {},
        progressCallback
      );
    }

    this.activeResumables.set(downloadId, resumable);

    await db.runAsync(
      'UPDATE downloads SET status = "DOWNLOADING", updatedAt = ? WHERE id = ?',
      [new Date().toISOString(), downloadId]
    );
    await this.notifyListeners();

    try {
      const result = await resumable.downloadAsync();
      if (result && result.uri) {
        await db.runAsync(
          'UPDATE downloads SET status = "COMPLETED", pauseStateJson = NULL, updatedAt = ? WHERE id = ?',
          [new Date().toISOString(), downloadId]
        );
      }
    } catch (error: any) {
      const isCancelled = this.activeResumables.get(downloadId) === undefined;
      if (!isCancelled) {
        await db.runAsync(
          'UPDATE downloads SET status = "FAILED", errorMessage = ?, updatedAt = ? WHERE id = ?',
          [String(error?.message || error), new Date().toISOString(), downloadId]
        );
      }
    } finally {
      this.activeResumables.delete(downloadId);
      await this.notifyListeners();
    }
  }

  /**
   * Pauses an active download and serializes pause state into SQLite.
   */
  async pauseDownload(downloadId: string): Promise<void> {
    const resumable = this.activeResumables.get(downloadId);
    const db = await this.getDb();

    if (resumable) {
      try {
        const pauseState = await resumable.pauseAsync();
        await db.runAsync(
          'UPDATE downloads SET status = "PAUSED", pauseStateJson = ?, updatedAt = ? WHERE id = ?',
          [JSON.stringify(pauseState), new Date().toISOString(), downloadId]
        );
      } catch (err: any) {
        await db.runAsync(
          'UPDATE downloads SET status = "PAUSED", updatedAt = ? WHERE id = ?',
          [new Date().toISOString(), downloadId]
        );
      } finally {
        this.activeResumables.delete(downloadId);
      }
    } else {
      await db.runAsync(
        'UPDATE downloads SET status = "PAUSED", updatedAt = ? WHERE id = ?',
        [new Date().toISOString(), downloadId]
      );
    }

    await this.notifyListeners();
  }

  /**
   * Cancels a download task, cleans up disk artifacts and secure tokens.
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const resumable = this.activeResumables.get(downloadId);
    if (resumable) {
      try {
        await resumable.cancelAsync();
      } catch {}
      this.activeResumables.delete(downloadId);
    }

    const db = await this.getDb();
    const record = await db.getFirstAsync(
      'SELECT localUri FROM downloads WHERE id = ?',
      [downloadId]
    );

    if (record?.localUri) {
      try {
        await FileSystem.deleteAsync(record.localUri, { idempotent: true });
      } catch {}
    }

    await this.removeSecureToken(downloadId).catch(() => {});
    await db.runAsync(
      'UPDATE downloads SET status = "CANCELLED", pauseStateJson = NULL, updatedAt = ? WHERE id = ?',
      [new Date().toISOString(), downloadId]
    );

    await this.notifyListeners();
  }

  /**
   * Delete download record completely from database and local storage.
   */
  async deleteDownload(downloadId: string): Promise<void> {
    await this.cancelDownload(downloadId);
    const db = await this.getDb();
    await db.runAsync('DELETE FROM downloads WHERE id = ?', [downloadId]);
    await this.notifyListeners();
  }

  /**
   * Fetches all downloads or filtered by accountId.
   */
  async getDownloads(accountId?: string): Promise<DownloadTaskRecord[]> {
    const db = await this.getDb();
    if (accountId) {
      return await db.getAllAsync(
        'SELECT * FROM downloads WHERE accountId = ? ORDER BY createdAt DESC',
        [accountId]
      );
    }
    return await db.getAllAsync(
      'SELECT * FROM downloads ORDER BY createdAt DESC'
    );
  }

  /**
   * Fetches single download record by ID.
   */
  async getDownloadById(downloadId: string): Promise<DownloadTaskRecord | null> {
    const db = await this.getDb();
    return await db.getFirstAsync(
      'SELECT * FROM downloads WHERE id = ?',
      [downloadId]
    );
  }

  /**
   * Returns localUri if media is downloaded and completed for offline playback.
   */
  async getCompletedDownloadUri(
    accountId: string,
    contentType: 'movie' | 'series',
    streamId: number
  ): Promise<string | null> {
    const db = await this.getDb();
    const record = await db.getFirstAsync(
      'SELECT localUri, status FROM downloads WHERE accountId = ? AND contentType = ? AND streamId = ? AND status = "COMPLETED"',
      [accountId, contentType, streamId]
    );
    return record?.localUri ?? null;
  }
}

export const DownloadManager = new DownloadService();
