import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entryStr = await AsyncStorage.getItem(`cache_${key}`);
      if (!entryStr) return null;

      const entry: CacheEntry<T> = JSON.parse(entryStr);
      if (Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const entryStr = await AsyncStorage.getItem(`cache_${key}`);
      if (!entryStr) return false;

      const entry: CacheEntry<any> = JSON.parse(entryStr);
      if (Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check cache:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
      return true;
    } catch (error) {
      console.error('Failed to delete cache:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const cacheManager = new CacheManager();

export const cache = {
  set: <T>(key: string, data: T, ttl?: number) => cacheManager.set(key, data, ttl),
  get: <T>(key: string): Promise<T | null> => cacheManager.get<T>(key),
  has: (key: string): Promise<boolean> => cacheManager.has(key),
  delete: (key: string): Promise<boolean> => cacheManager.delete(key),
  clear: (): Promise<void> => cacheManager.clear(),
};
