import { CameraData, Incident, PatrolUnit, NotificationItem, TimelineEvent, AlertItem } from '../types';
import { safeFetch, APIError, getUserFriendlyError } from '../utils/errorHandling';

// API interface for camera management
interface BackendCamera {
  camera_id: string;
  camera_name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  zone: string;
  risk_level: string;
  status: string;
  video_source: string;
  camera_type: string;
  created_at: string;
}

// Authentication token management
class AuthService {
  private token: string | null = null;
  private user: any = null;

  setToken(token: string, user: any) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  getUser(): any {
    if (!this.user) {
      const userStr = localStorage.getItem('auth_user');
      this.user = userStr ? JSON.parse(userStr) : null;
    }
    return this.user;
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();

// Transform backend camera to frontend CameraData
function transformBackendToCamera(backend: BackendCamera): CameraData {
  const riskLevel = backend.risk_level;
  let aiStatus = "AI_ACTIVE";
  let aiStatusType: "danger" | "warning" | "info" | "success" = "success";
  let severity = 1.0;

  // Map risk level to AI status
  if (riskLevel === "CRITICAL") {
    aiStatus = "CRITICAL AI ALERT";
    aiStatusType = "danger";
    severity = 9.0;
  } else if (riskLevel === "HIGH") {
    aiStatus = "HIGH THREAT DETECTED";
    aiStatusType = "warning";
    severity = 7.0;
  } else if (riskLevel === "MEDIUM") {
    aiStatus = "MONITORING";
    aiStatusType = "info";
    severity = 5.0;
  } else {
    aiStatus = "NORMAL";
    aiStatusType = "success";
    severity = 3.0;
  }

  return {
    id: backend.camera_id,
    name: backend.camera_name,
    location: `${backend.zone} - ${backend.city}, ${backend.state}`,
    status: backend.status === "ONLINE" ? "REC" : "OFFLINE",
    fps: "30.0 FPS",
    resolution: "1080p FHD",
    aiStatus: aiStatus,
    aiStatusType: aiStatusType,
    severity: severity,
    lat: backend.latitude,
    lng: backend.longitude,
    videoUrl: backend.video_source,
    detections: [],
    aiMetrics: {
      weapon: false,
      weaponConfidence: 0,
      fight: false,
      fightConfidence: 0,
      people: 0,
      blood: false,
      severity: severity,
      trackingIDs: []
    }
  };
}

class DataService {
  private cameras: CameraData[] = [];
  private listeners: Array<() => void> = [];
  private isLoading = false;

  constructor() {
    this.loadCameras();
  }

  public async loadCameras() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    try {
      const response = await safeFetch('/api/cameras');
      
      if (response) {
        const backendCameras: BackendCamera[] = await response.json();
        this.cameras = backendCameras.map(transformBackendToCamera);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading cameras:', error);
      const userMessage = getUserFriendlyError(error instanceof Error ? error : new Error('Unknown error'));
      console.error('User message:', userMessage);
    } finally {
      this.isLoading = false;
    }
  }

  public async refreshCameras() {
    await this.loadCameras();
  }

  public getCameras(): CameraData[] {
    return this.cameras;
  }

  public getCameraById(id: string): CameraData | undefined {
    return this.cameras.find(c => c.id === id);
  }

  // Method to allow Python WebSocket or API mock injection
  public updateDetectionOverlay(cameraId: string, newOverlay: any, newMetrics?: any) {
    const camIndex = this.cameras.findIndex(c => c.id === cameraId);
    if (camIndex !== -1) {
      this.cameras[camIndex].detections = newOverlay;
      if (newMetrics) {
        this.cameras[camIndex].aiMetrics = newMetrics;
      }
      this.notifyListeners();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

export const dataService = new DataService();

// Global detectionOverlay for Python WebSocket bridge readiness
(window as any).detectionOverlay = [];
(window as any).updateSentinelDetections = (cameraId: string, overlay: any, metrics: any) => {
  dataService.updateDetectionOverlay(cameraId, overlay, metrics);
};
