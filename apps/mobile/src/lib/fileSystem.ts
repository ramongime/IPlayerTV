import * as fs from 'node:fs';
import * as path from 'node:path';

let expoFileSystem: any = null;
try {
  expoFileSystem = require('expo-file-system');
} catch {}

export const documentDirectory =
  expoFileSystem?.documentDirectory || path.join(process.cwd(), '.tmp_downloads/');

export async function makeDirectoryAsync(
  dir: string,
  options?: { intermediates?: boolean }
): Promise<void> {
  if (expoFileSystem?.makeDirectoryAsync) {
    return await expoFileSystem.makeDirectoryAsync(dir, options);
  }
  const cleanPath = dir.replace('file://', '');
  await fs.promises.mkdir(cleanPath, { recursive: true });
}

export async function deleteAsync(
  fileUri: string,
  options?: { idempotent?: boolean }
): Promise<void> {
  if (expoFileSystem?.deleteAsync) {
    return await expoFileSystem.deleteAsync(fileUri, options);
  }
  const cleanPath = fileUri.replace('file://', '');
  try {
    await fs.promises.rm(cleanPath, { recursive: true, force: true });
  } catch (err) {
    if (!options?.idempotent) throw err;
  }
}

export interface MockDownloadResumable {
  downloadAsync: () => Promise<{ uri: string } | undefined>;
  pauseAsync: () => Promise<{ url: string; fileUri: string; options: any; resumeData: string }>;
  cancelAsync: () => Promise<void>;
}

export function createDownloadResumable(
  url: string,
  fileUri: string,
  options?: any,
  callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
  resumeData?: string
): MockDownloadResumable {
  if (expoFileSystem?.createDownloadResumable) {
    return expoFileSystem.createDownloadResumable(url, fileUri, options, callback, resumeData);
  }

  return {
    async downloadAsync() {
      const cleanPath = fileUri.replace('file://', '');
      const dir = path.dirname(cleanPath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(cleanPath, 'mock_vod_media_bytes');
      if (callback) {
        callback({ totalBytesWritten: 1024, totalBytesExpectedToWrite: 1024 });
      }
      return { uri: fileUri };
    },
    async pauseAsync() {
      return {
        url,
        fileUri,
        options: options || {},
        resumeData: resumeData || JSON.stringify({ url, fileUri, bytes: 512 }),
      };
    },
    async cancelAsync() {
      const cleanPath = fileUri.replace('file://', '');
      try {
        await fs.promises.rm(cleanPath, { force: true });
      } catch {}
    },
  };
}
