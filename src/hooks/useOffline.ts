import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    NetInfo.fetch().then(state => {
      setIsOffline(!state.isConnected);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return unsubscribe;
  }, []);

  return { isOffline };
}
