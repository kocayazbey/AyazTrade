import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
}

export class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = true;
  private pendingActions: OfflineData[] = [];

  private constructor() {
    this.initializeNetworkListener();
    this.loadPendingActions();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async initializeNetworkListener(): Promise<void> {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  private async loadPendingActions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_actions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }

  private async savePendingActions(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_actions', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }

  public async storeOfflineAction(
    key: string,
    data: any,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    endpoint: string
  ): Promise<void> {
    const offlineData: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      action,
      endpoint,
    };

    this.pendingActions.push(offlineData);
    await this.savePendingActions();

    Alert.alert(
      'Offline Mode',
      'Your action has been saved and will be synced when you\'re back online.',
      [{ text: 'OK' }]
    );
  }

  public async getOfflineData(key: string): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem(`offline_data_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  public async setOfflineData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`offline_data_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to set offline data:', error);
    }
  }

  public async removeOfflineData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`offline_data_${key}`);
    } catch (error) {
      console.error('Failed to remove offline data:', error);
    }
  }

  public isConnected(): boolean {
    return this.isOnline;
  }

  public getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  private async syncPendingActions(): Promise<void> {
    if (this.pendingActions.length === 0) return;

    Alert.alert(
      'Syncing Data',
      `Syncing ${this.pendingActions.length} pending actions...`,
      [{ text: 'OK' }]
    );

    const actionsToSync = [...this.pendingActions];
    this.pendingActions = [];

    for (const action of actionsToSync) {
      try {
        // Here you would make the actual API call
        // For now, we'll just simulate success
        console.log(`Syncing action: ${action.action} for ${action.endpoint}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      } catch (error) {
        console.error('Failed to sync action:', error);
        // Re-add failed actions to pending
        this.pendingActions.push(action);
      }
    }

    await this.savePendingActions();
  }

  public async clearAllOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'offline_actions',
        ...(await AsyncStorage.getAllKeys()).filter(key => key.startsWith('offline_data_'))
      ]);
      this.pendingActions = [];
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }
}
