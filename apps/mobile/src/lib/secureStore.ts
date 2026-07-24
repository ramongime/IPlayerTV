let expoSecureStore: any = null;
try {
  expoSecureStore = require('expo-secure-store');
} catch {}

const memoryStore = new Map<string, string>();

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (expoSecureStore?.setItemAsync) {
    return await expoSecureStore.setItemAsync(key, value);
  }
  memoryStore.set(key, value);
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (expoSecureStore?.getItemAsync) {
    return await expoSecureStore.getItemAsync(key);
  }
  return memoryStore.get(key) ?? null;
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (expoSecureStore?.deleteItemAsync) {
    return await expoSecureStore.deleteItemAsync(key);
  }
  memoryStore.delete(key);
}
