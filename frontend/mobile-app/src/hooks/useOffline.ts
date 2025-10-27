import { useState, useEffect } from 'react';
import { OfflineService } from '../services/OfflineService';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  useEffect(() => {
    const offlineService = OfflineService.getInstance();
    
    const checkStatus = () => {
      setIsOnline(offlineService.isConnected());
      setPendingActionsCount(offlineService.getPendingActionsCount());
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    pendingActionsCount,
    offlineService: OfflineService.getInstance(),
  };
};
