export interface AiMetrics {
  weapon: boolean;
  weaponConfidence: number;
  fight: boolean;
  fightConfidence: number;
  people: number;
  blood: boolean;
  severity: number;
  trackingIDs: number[];
}

export interface DetectionBox {
  id: number;
  type: string;
  label: string;
  confidence: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  w: number; // percentage 0-100
  h: number; // percentage 0-100
  color: string;
  trackId: string;
}

export interface CameraData {
  id: string;
  camera_id?: string;
  name: string;
  location: string;
  status: 'REC' | 'WEAK_SIGNAL' | 'AI_ACTIVE' | 'OFFLINE';
  fps: string;
  resolution: string;
  aiStatus: string;
  aiStatusType: 'danger' | 'warning' | 'info' | 'success';
  severity: number;
  lat: number;
  lng: number;
  videoUrl: string;
  thumbnailUrl?: string;
  detections: DetectionBox[];
  aiMetrics: AiMetrics;
}

export interface EvidenceItem {
  id: string;
  title: string;
  timestamp: string;
  confidence: number;
  type: string;
  bbox: [number, number, number, number];
}

export interface Incident {
  id: string;
  title: string;
  location: string;
  station: string;
  timestamp: string;
  severity: number;
  severityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'Active' | 'Dispatched' | 'Investigating' | 'Resolved';
  camera: string;
  cameraId: string;
  assignedUnit: string;
  lat: number;
  lng: number;
  aiAnalysis: AiMetrics;
  description: string;
  policeNotes: string;
  volunteerNotes: string;
  evidenceGallery: EvidenceItem[];
}

export interface PatrolUnit {
  id: string;
  name: string;
  officers: string[];
  badge: string;
  status: 'DISPATCHED' | 'ON_SCENE' | 'PATROLLING' | 'AIRBORNE';
  statusColor: 'danger' | 'warning' | 'success' | 'info';
  vehicle: string;
  location: string;
  lat: number;
  lng: number;
  distance: string;
  eta: string;
  radioChannel: string;
  equipment: string[];
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  type: 'CRITICAL' | 'DISPATCH' | 'INFO' | 'FACIAL' | 'ALERT' | 'WARNING';
  message: string;
  cameraId?: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  details: string;
  actor: string;
  type: 'info' | 'warning' | 'danger' | 'dispatch' | 'success';
}

export interface AlertItem {
  id: string;
  incidentId: string;
  title: string;
  location: string;
  severity: number;
  timeAgo: string;
  camera: string;
  type: string;
  status: 'UNHANDLED' | 'HANDLED' | 'DISPATCHED';
}

export type ViewType = 'landing' | 'command_center' | 'live_cameras' | 'investigation' | 'analytics' | 'fleet_units';
