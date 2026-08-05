import { useState, useEffect, useCallback } from 'react';
import { safeFetch, getUserFriendlyError } from '../utils/errorHandling';

interface UseRealTimeDataOptions {
  endpoint: string;
  interval?: number;
  enabled?: boolean;
}

export function useRealTimeData<T>(options: UseRealTimeDataOptions) {
  const { endpoint, interval = 5000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await safeFetch(endpoint);
      if (response) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      const userMessage = getUserFriendlyError(err instanceof Error ? err : new Error('Unknown error'));
      setError(userMessage);
      console.error(`Error fetching ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    fetchData();
    
    if (enabled && interval > 0) {
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, interval, enabled]);

  return { data, loading, error, refetch: fetchData };
}

// Hook for multiple endpoints
export function useMultiRealTimeData<T>(endpoints: string[], interval: number = 5000) {
  const [data, setData] = useState<Record<string, T>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<string, T> = {};
      const errorResults: Record<string, string> = {};

      await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await safeFetch(endpoint);
            if (response && response.ok) {
              const result = await response.json();
              results[endpoint] = result;
            } else {
              throw new Error(`HTTP error! status: ${response?.status}`);
            }
          } catch (err) {
            errorResults[endpoint] = err instanceof Error ? err.message : 'Failed to fetch';
          }
        })
      );

      setData(results);
      setErrors(errorResults);
      setLoading(false);
    };

    fetchAll();
    const intervalId = setInterval(fetchAll, interval);
    return () => clearInterval(intervalId);
  }, [endpoints, interval]);

  return { data, loading, errors };
}
