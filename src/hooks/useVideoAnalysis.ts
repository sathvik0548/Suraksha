import { useState, useCallback } from 'react';
import { CameraData } from '../types';
import { safeFetch, getUserFriendlyError } from '../utils/errorHandling';

interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
}

export function useVideoAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = useCallback(async (camera: CameraData) => {
    setIsAnalyzing(true);
    setError(null);
    setProgress({ stage: 'uploading', progress: 10, message: 'Uploading video...' });

    try {
      setProgress({ stage: 'processing', progress: 30, message: 'Processing video...' });

      // Upload and analyze
      const response = await safeFetch('/api/v1/analyze', {
        method: 'POST',
        body: JSON.stringify({
          video: camera.videoUrl,
          camera_id: camera.id,
          camera_name: camera.name,
          location: camera.location,
          lat: camera.lat,
          lng: camera.lng
        }),
      });

      if (response) {
        const result = await response.json();
        setIncidentId(result.incident_id);
        setProgress({ stage: 'polling', progress: 60, message: 'Analyzing results...' });

        // Poll for completion
        await pollForCompletion(result.incident_id);

        setProgress({ stage: 'completed', progress: 100, message: 'Analysis complete!' });

        return result.incident_id;
      }
    } catch (err) {
      const userMessage = getUserFriendlyError(err instanceof Error ? err : new Error('Unknown error'));
      setError(userMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const pollForCompletion = useCallback(async (id: string) => {
    const maxAttempts = 30; // 30 attempts * 2 seconds = 1 minute max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await safeFetch(`/api/v1/incident/latest`);
        if (response) {
          const incident = await response.json();
          if (incident.id === id && incident.status !== 'processing') {
            return incident;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Analysis timeout');
  }, []);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setProgress(null);
    setIncidentId(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    progress,
    incidentId,
    error,
    analyzeVideo,
    reset
  };
}
