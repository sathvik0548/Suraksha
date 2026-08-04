import { useState, useEffect, useCallback, useRef } from 'react';

interface DemoModeOptions {
  enabled: boolean;
  interval?: number;
  onIncidentGenerated?: (cameraId: string) => void;
}

export function useDemoMode(options: DemoModeOptions) {
  const { enabled, interval = 20000, onIncidentGenerated } = options;
  const [isRunning, setIsRunning] = useState(enabled);
  const [currentCamera, setCurrentCamera] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // Simulate random camera selection
      const cameras = ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04', 'CAM-05', 'CAM-06'];
      const randomCamera = cameras[Math.floor(Math.random() * cameras.length)];
      setCurrentCamera(randomCamera);

      // Trigger incident callback
      onIncidentGenerated?.(randomCamera);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, interval, onIncidentGenerated]);

  return {
    isRunning,
    currentCamera,
    start,
    stop,
    toggle
  };
}
