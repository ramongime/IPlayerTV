const FileSystem = require('expo-file-system');

export const documentDirectory: string = FileSystem.documentDirectory;
export const makeDirectoryAsync = FileSystem.makeDirectoryAsync;
export const deleteAsync = FileSystem.deleteAsync;
export const createDownloadResumable = FileSystem.createDownloadResumable;
