import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
// Thirty-second cadence plus foreground refresh; no per-marker timers.
export function useBusinessClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return now;
}
