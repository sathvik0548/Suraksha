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

  const pollForCompletion = useCallback(async (jobId: string) => {
    const maxAttempts = 300; // 300 * 2s = 10 mins max for long videos
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await safeFetch(`/api/v1/analyze/status/${jobId}`);
        if (response && response.ok) {
          const job = await response.json();
          
          if (job.status === 'completed') {
            setIncidentId(job.incident_id);
            return job;
          }
          if (job.status === 'failed') {
            throw new Error(job.error || 'Video analysis failed on server');
          }

          if (job.stage) {
            const calculatedProgress = Math.min(
              95,
              30 + Math.round((attempts / maxAttempts) * 65)
            );
            setProgress({
              stage: job.stage,
              progress: calculatedProgress,
              message: `Processing (${job.stage})...`,
            });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (err instanceof Error && err.message.includes('failed')) {
          throw err;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Analysis timeout — processing took too long');
  }, []);

  const analyzeVideo = useCallback(
    async (camera: CameraData, videoFile?: File) => {
      setIsAnalyzing(true);
      setError(null);
      setProgress({ stage: 'uploading', progress: 10, message: 'Preparing video upload...' });

      try {
        let fileToUpload: File;

        if (videoFile) {
          fileToUpload = videoFile;
        } else if (camera.videoUrl) {
          // If given a URL string (demo/asset video), fetch it to create a real File object
          setProgress({ stage: 'fetching', progress: 15, message: 'Fetching video asset...' });
          const fetchRes = await fetch(camera.videoUrl);
          if (!fetchRes.ok) {
            throw new Error(`Failed to fetch video asset from ${camera.videoUrl}`);
          }
          const blob = await fetchRes.blob();
          const filename = camera.videoUrl.split('/').pop() || 'video.mp4';
          fileToUpload = new File([blob], filename, { type: blob.type || 'video/mp4' });
        } else {
          throw new Error('No video file or URL provided for analysis');
        }

        // Validate format & file size before upload
        const allowedExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
        const fileExt = '.' + fileToUpload.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
          throw new Error(`Unsupported file format (${fileExt}). Supported: ${allowedExtensions.join(', ')}`);
        }

        const maxBytes = 500 * 1024 * 1024; // 500MB
        if (fileToUpload.size > maxBytes) {
          throw new Error(`File size (${(fileToUpload.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit (500MB)`);
        }

        setProgress({ stage: 'uploading', progress: 25, message: 'Uploading video to server...' });

        // Construct FormData payload
        const formData = new FormData();
        formData.append('video', fileToUpload);
        formData.append('camera_id', camera.id || 'CAM-CUSTOM');
        formData.append('camera_name', camera.name || 'Custom Upload Camera');
        formData.append('location', camera.location || 'Surveillance Zone');
        formData.append('lat', String(camera.lat || 40.7128));
        formData.append('lng', String(camera.lng || -74.0060));

        const response = await safeFetch('/api/v1/analyze', {
          method: 'POST',
          body: formData,
        });

        if (response) {
          const result = await response.json();
          const jobId = result.job_id || result.incident_id;
          
          setProgress({ stage: 'processing', progress: 35, message: 'Analysis started. Monitoring progress...' });

          // Poll for completion
          const finalJob = await pollForCompletion(jobId);

          setProgress({ stage: 'completed', progress: 100, message: 'Analysis completed successfully!' });
          return finalJob.incident_id;
        }
      } catch (err) {
        const userMessage = getUserFriendlyError(err instanceof Error ? err : new Error('Unknown error'));
        setError(userMessage);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [pollForCompletion]
  );

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
    reset,
  };
}
