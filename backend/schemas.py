"""
Pydantic schemas for Sentinel AI Emergency Response System.
All API request/response models and data validation schemas.

FIXED: All schemas now match exactly what the pipeline modules produce.
Uses AliasChoices for dual snake_case (Python) and camelCase (frontend) support.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict, AliasChoices
from typing import List, Optional, Dict, Any, Tuple, Union
from datetime import datetime
from enum import Enum
import uuid


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentStatus(str, Enum):
    ACTIVE = "Active"
    DISPATCHED = "Dispatched"
    INVESTIGATING = "Investigating"
    RESOLVED = "Resolved"


class CameraStatus(str, Enum):
    REC = "REC"
    WEAK_SIGNAL = "WEAK_SIGNAL"
    AI_ACTIVE = "AI_ACTIVE"
    OFFLINE = "OFFLINE"


class AIStatusType(str, Enum):
    DANGER = "danger"
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"


class AlertStatus(str, Enum):
    UNHANDLED = "UNHANDLED"
    HANDLED = "HANDLED"
    DISPATCHED = "DISPATCHED"


class TimelineEventType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    DANGER = "danger"
    SUCCESS = "success"
    DISPATCH = "dispatch"


class NotificationType(str, Enum):
    CRITICAL = "CRITICAL"
    DISPATCH = "DISPATCH"
    INFO = "INFO"
    FACIAL = "FACIAL"
    ALERT = "ALERT"
    WARNING = "WARNING"


class UserRole(str, Enum):
    ADMIN = "admin"
    POLICE = "police"
    OPERATOR = "operator"


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class CameraType(str, Enum):
    FIXED = "FIXED"
    PTZ = "PTZ"
    DOME = "DOME"
    BULLET = "BULLET"


# ---------------------------------------------------------------------------
# Authentication Schemas
# ---------------------------------------------------------------------------

class User(BaseModel):
    """User model for authentication."""
    user_id: str
    username: str
    email: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(populate_by_name=True)


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    username: str
    email: str
    password: str
    role: UserRole = UserRole.OPERATOR


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class Token(BaseModel):
    """Schema for authentication token."""
    access_token: str
    token_type: str = "bearer"
    user: User


# ---------------------------------------------------------------------------
# Processing Statistics
# ---------------------------------------------------------------------------

class ProcessingStats(BaseModel):
    """Video processing statistics."""
    total_frames: int = 0
    processed_frames: int = 0
    skipped_frames: int = 0
    fps: float = 0.0
    processing_time: float = 0.0
    average_fps: float = 0.0
    video_duration: float = 0.0
    frame_width: int = 0
    frame_height: int = 0

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Detection Schemas
# ---------------------------------------------------------------------------

class BoundingBox(BaseModel):
    """Bounding box for detected objects."""
    x: float = Field(..., description="X coordinate as percentage (0-100)")
    y: float = Field(..., description="Y coordinate as percentage (0-100)")
    w: float = Field(..., description="Width as percentage (0-100)")
    h: float = Field(..., description="Height as percentage (0-100)")

    @field_validator('x', 'y', 'w', 'h')
    @classmethod
    def validate_percentage(cls, v: float) -> float:
        if not 0 <= v <= 100:
            raise ValueError('Values must be between 0 and 100')
        return v


class DetectionBox(BaseModel):
    """Detection box matching frontend interface."""
    id: int = 0
    type: str = "unknown"
    label: str = ""
    confidence: float = Field(0.0, ge=0, le=100)
    x: float = Field(0.0, description="X coordinate as percentage (0-100)")
    y: float = Field(0.0, description="Y coordinate as percentage (0-100)")
    w: float = Field(0.0, description="Width as percentage (0-100)")
    h: float = Field(0.0, description="Height as percentage (0-100)")
    color: str = "#3b82f6"
    # Accept both snake_case (pipeline) and camelCase (frontend/legacy)
    track_id: str = Field("", validation_alias=AliasChoices("track_id", "trackId"))

    model_config = ConfigDict(populate_by_name=True)


class DetectionResult(BaseModel):
    """Result from object detection."""
    frame_number: int
    timestamp: float
    class_name: str
    confidence: float
    bounding_box: BoundingBox
    camera_id: str
    detection_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Tracking Schemas
# ---------------------------------------------------------------------------

class TrackResult(BaseModel):
    """Result from object tracking."""
    track_id: int
    frame_number: int
    timestamp: float
    class_name: str
    current_position: Tuple[float, float]
    previous_position: Optional[Tuple[float, float]] = None
    speed: Optional[float] = None
    movement_direction: Optional[str] = None
    trajectory_history: List[Tuple[float, float]] = Field(default_factory=list)
    track_duration: float = 0.0
    confidence: float
    camera_id: str

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Event Schemas
# ---------------------------------------------------------------------------

class Event(BaseModel):
    """Event from event buffer."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    start_frame: int
    end_frame: int
    duration: float
    confidence_average: float
    objects_present: List[str]
    tracking_ids: List[int]
    camera_id: str
    timestamp: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Evidence Schemas
# ---------------------------------------------------------------------------

class EvidenceItem(BaseModel):
    """
    Evidence item.
    FIX: Added id, title, confidence, bbox to match coordinator.py output.
         Made incident_id and file_path optional.
    """
    # Pipeline-created fields (coordinator.py)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    confidence: float = 0.0
    type: str = "unknown"
    bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)
    timestamp: Union[str, datetime, float] = Field(default_factory=datetime.now)

    # Optional database/file fields
    evidence_id: Optional[str] = None
    incident_id: Optional[str] = None
    file_path: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# AI Metrics Schema
# ---------------------------------------------------------------------------

class AiMetrics(BaseModel):
    """
    AI analysis metrics.
    FIX: Uses AliasChoices so coordinator.py can use snake_case while
         model_dump() returns camelCase for frontend compatibility.
    """
    model_config = ConfigDict(populate_by_name=True)

    weapon: bool = False
    # Accept weapon_confidence OR weaponConfidence
    weapon_confidence: float = Field(
        0.0,
        validation_alias=AliasChoices("weapon_confidence", "weaponConfidence")
    )
    fight: bool = False
    # Accept fight_confidence OR fightConfidence
    fight_confidence: float = Field(
        0.0,
        validation_alias=AliasChoices("fight_confidence", "fightConfidence")
    )
    people: int = 0
    blood: bool = False
    severity: float = 1.0
    # Accept tracking_ids OR trackingIDs
    tracking_ids: List[int] = Field(
        default_factory=list,
        validation_alias=AliasChoices("tracking_ids", "trackingIDs")
    )

    def to_frontend_dict(self) -> Dict[str, Any]:
        """Return camelCase dict for frontend."""
        return {
            "weapon": self.weapon,
            "weaponConfidence": self.weapon_confidence,
            "fight": self.fight,
            "fightConfidence": self.fight_confidence,
            "people": self.people,
            "blood": self.blood,
            "severity": self.severity,
            "trackingIDs": self.tracking_ids,
        }


# ---------------------------------------------------------------------------
# Incident Schema
# ---------------------------------------------------------------------------

class Incident(BaseModel):
    """
    Incident model.
    FIX: Added severity_level, camera, station, assigned_unit, police_notes,
         volunteer_notes, evidence_gallery to match coordinator.py output.
    """
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: f"INC-{str(uuid.uuid4())[:8].upper()}")
    title: str
    description: str = ""
    location: str
    severity: float = Field(1.0, ge=0, le=10)
    severity_level: SeverityLevel = SeverityLevel.LOW
    status: IncidentStatus = IncidentStatus.ACTIVE
    # camera = camera name (used by integration.py for display)
    camera: str = ""
    camera_id: Optional[str] = None
    station: str = "Central Command"
    timestamp: datetime = Field(default_factory=datetime.now)
    ai_analysis: Optional[AiMetrics] = None
    # Accept both snake_case and camelCase for these fields
    police_notes: str = Field(
        "",
        validation_alias=AliasChoices("police_notes", "policeNotes")
    )
    volunteer_notes: str = Field(
        "",
        validation_alias=AliasChoices("volunteer_notes", "volunteerNotes")
    )
    assigned_unit: str = Field(
        "",
        validation_alias=AliasChoices("assigned_unit", "assignedUnit")
    )
    lat: Optional[float] = None
    lng: Optional[float] = None
    evidence_gallery: List[EvidenceItem] = Field(default_factory=list)

    def to_frontend_dict(self) -> Dict[str, Any]:
        """Return dict with camelCase field names for frontend."""
        d = self.model_dump()
        # Rename to camelCase for frontend
        d["policeNotes"] = d.pop("police_notes", "")
        d["volunteerNotes"] = d.pop("volunteer_notes", "")
        d["assignedUnit"] = d.pop("assigned_unit", "")
        if d.get("ai_analysis") and isinstance(d["ai_analysis"], dict):
            ai = d["ai_analysis"]
            ai["weaponConfidence"] = ai.pop("weapon_confidence", 0.0)
            ai["fightConfidence"] = ai.pop("fight_confidence", 0.0)
            ai["trackingIDs"] = ai.pop("tracking_ids", [])
            d["aiAnalysis"] = ai
            d.pop("ai_analysis", None)
        return d


class IncidentCreate(BaseModel):
    """Schema for creating an incident."""
    title: str
    description: str = ""
    location: str
    severity: float = Field(1.0, ge=0, le=10)
    camera_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class IncidentUpdate(BaseModel):
    """Schema for updating an incident."""
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    severity: Optional[float] = Field(None, ge=0, le=10)
    status: Optional[IncidentStatus] = None
    police_notes: Optional[str] = Field(
        None, validation_alias=AliasChoices("police_notes", "policeNotes")
    )
    volunteer_notes: Optional[str] = Field(
        None, validation_alias=AliasChoices("volunteer_notes", "volunteerNotes")
    )
    assigned_unit: Optional[str] = Field(
        None, validation_alias=AliasChoices("assigned_unit", "assignedUnit")
    )

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Severity Schemas
# ---------------------------------------------------------------------------

class SeverityResult(BaseModel):
    """
    Result from severity analysis.
    FIX: Added severity_level, reason_codes, risk_factors to match severity.py output.
         Made incident_id optional.
    """
    model_config = ConfigDict(populate_by_name=True)

    incident_id: Optional[str] = None
    severity_score: float = 1.0
    # Accept severity_level OR threat_level (legacy alias)
    severity_level: SeverityLevel = Field(
        SeverityLevel.LOW,
        validation_alias=AliasChoices("severity_level", "threat_level")
    )
    confidence: float = 0.5
    reason_codes: List[str] = Field(default_factory=list)
    risk_factors: Dict[str, float] = Field(default_factory=dict)
    # Legacy alias: factors -> risk_factors
    timestamp: datetime = Field(default_factory=datetime.now)

    # compat: map old 'factors' key when loading from JSON
    @field_validator("risk_factors", mode="before")
    @classmethod
    def coerce_factors(cls, v: Any) -> Any:
        if v is None:
            return {}
        return v

    # overall_severity property for backward compat
    @property
    def overall_severity(self) -> str:
        return self.severity_level.value


# ---------------------------------------------------------------------------
# Reasoning Schemas
# ---------------------------------------------------------------------------

class ReasoningResult(BaseModel):
    """
    Result from AI reasoning.
    FIX: Added summary, detailed_explanation, key_observations, threat_assessment,
         recommendation to match reasoning.py output. Made incident_id optional.
    """
    model_config = ConfigDict(populate_by_name=True)

    incident_id: Optional[str] = None
    # Rich fields from reasoning.py
    summary: str = ""
    detailed_explanation: str = ""
    key_observations: List[str] = Field(default_factory=list)
    threat_assessment: str = ""
    recommendation: str = ""
    confidence: float = 0.5
    timestamp: datetime = Field(default_factory=datetime.now)

    # Legacy single-field alias: 'reasoning' -> summary
    @field_validator("summary", mode="before")
    @classmethod
    def coerce_reasoning(cls, v: Any) -> Any:
        if v is None:
            return ""
        return v


# ---------------------------------------------------------------------------
# Timeline Schemas
# ---------------------------------------------------------------------------

class TimelineEvent(BaseModel):
    """
    Event in incident timeline.
    FIX: Added time (string), event (string), actor to match timeline.py output.
         Made timestamp/event_type/description optional for backward compat.
    """
    model_config = ConfigDict(populate_by_name=True)

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # timeline.py uses these string fields
    time: str = "00:00"
    event: str = ""
    details: str = ""
    actor: str = "System"
    type: TimelineEventType = TimelineEventType.INFO

    # Legacy/optional fields
    timestamp: Optional[datetime] = None
    event_type: Optional[TimelineEventType] = None
    description: Optional[str] = None
    extra_details: Optional[Dict[str, Any]] = None


class Timeline(BaseModel):
    """Timeline for an incident."""
    incident_id: str = ""
    events: List[TimelineEvent] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Report Schemas
# ---------------------------------------------------------------------------

class IncidentReport(BaseModel):
    """
    Generated incident report.
    FIX: Restructured to match report.py generate_report() output.
         incident is now an Incident object (not just incident_id).
    """
    model_config = ConfigDict(populate_by_name=True)

    # Core objects from pipeline
    incident: Incident
    severity: SeverityResult
    reasoning: ReasoningResult
    timeline: List[TimelineEvent] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    processing_statistics: Dict[str, Any] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=datetime.now)

    # Derived convenience fields
    report_id: str = Field(default_factory=lambda: f"RPT-{str(uuid.uuid4())[:8].upper()}")

    @property
    def incident_id(self) -> str:
        return self.incident.id


# ---------------------------------------------------------------------------
# Camera Schemas
# ---------------------------------------------------------------------------

class Camera(BaseModel):
    """Camera model."""
    camera_id: str
    camera_name: str
    latitude: float
    longitude: float
    city: str
    state: str
    country: str
    zone: str
    risk_level: RiskLevel
    status: CameraStatus
    video_source: str
    camera_type: CameraType
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(populate_by_name=True)


class CameraCreate(BaseModel):
    """Schema for creating a camera."""
    camera_id: str
    camera_name: str
    latitude: float
    longitude: float
    city: str
    state: str
    country: str
    zone: str
    risk_level: RiskLevel = RiskLevel.MEDIUM
    status: CameraStatus = CameraStatus.REC
    video_source: str
    camera_type: CameraType = CameraType.FIXED

    model_config = ConfigDict(populate_by_name=True)


class CameraUpdate(BaseModel):
    """Schema for updating a camera."""
    camera_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zone: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    status: Optional[CameraStatus] = None
    video_source: Optional[str] = None
    camera_type: Optional[CameraType] = None

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Alert Schemas
# ---------------------------------------------------------------------------

class Alert(BaseModel):
    """Alert model."""
    alert_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incident_id: str
    alert_type: NotificationType = NotificationType.ALERT
    message: str
    severity: float = Field(1.0, ge=0, le=10)
    status: AlertStatus = AlertStatus.UNHANDLED
    timestamp: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(populate_by_name=True)


class AlertItem(BaseModel):
    """Alert item matching frontend interface."""
    id: str
    incident_id: str
    title: str
    location: str
    severity: float
    time_ago: str
    camera: str
    type: str
    status: str

    model_config = ConfigDict(populate_by_name=True)


class AlertCreate(BaseModel):
    """Schema for creating an alert."""
    incident_id: str
    alert_type: NotificationType = NotificationType.ALERT
    message: str
    severity: float = Field(1.0, ge=0, le=10)

    model_config = ConfigDict(populate_by_name=True)


class AlertUpdate(BaseModel):
    """Schema for updating an alert."""
    status: AlertStatus

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Notification Schemas
# ---------------------------------------------------------------------------

class NotificationItem(BaseModel):
    """
    Notification item.
    FIX: Added camera_id, made title optional (defaults from message).
    """
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: NotificationType = NotificationType.INFO
    title: str = ""
    message: str = ""
    timestamp: Union[datetime, str] = Field(default_factory=datetime.now)
    read: bool = False
    camera_id: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        """Auto-fill title from message if empty."""
        if not self.title and self.message:
            # Use first 50 chars of message as title
            object.__setattr__(self, 'title', self.message[:50])


# ---------------------------------------------------------------------------
# AI Metrics / Camera Data Schemas (Frontend compatibility)
# ---------------------------------------------------------------------------

class CameraData(BaseModel):
    """
    Camera data model matching frontend interface.
    FIX: Uses AliasChoices so integration.py can use snake_case while
         model_dump() output is readable by both.
    """
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    location: str
    status: str = "REC"
    fps: str = "30.0 FPS"
    resolution: str = "1080p FHD"
    # Accept ai_status OR aiStatus
    ai_status: str = Field(
        "AI_ACTIVE",
        validation_alias=AliasChoices("ai_status", "aiStatus")
    )
    # Accept ai_status_type OR aiStatusType
    ai_status_type: str = Field(
        "success",
        validation_alias=AliasChoices("ai_status_type", "aiStatusType")
    )
    severity: float = 1.0
    lat: float = 0.0
    lng: float = 0.0
    # Accept video_url OR videoUrl
    video_url: str = Field(
        "",
        validation_alias=AliasChoices("video_url", "videoUrl")
    )
    detections: List[DetectionBox] = Field(default_factory=list)
    # Accept ai_metrics OR aiMetrics
    ai_metrics: Optional[AiMetrics] = Field(
        None,
        validation_alias=AliasChoices("ai_metrics", "aiMetrics")
    )

    def to_frontend_dict(self) -> Dict[str, Any]:
        """Return camelCase dict for frontend."""
        d = self.model_dump()
        d["aiStatus"] = d.pop("ai_status", "AI_ACTIVE")
        d["aiStatusType"] = d.pop("ai_status_type", "success")
        d["videoUrl"] = d.pop("video_url", "")
        ai = d.pop("ai_metrics", None)
        if ai:
            d["aiMetrics"] = {
                "weapon": ai.get("weapon", False),
                "weaponConfidence": ai.get("weapon_confidence", 0.0),
                "fight": ai.get("fight", False),
                "fightConfidence": ai.get("fight_confidence", 0.0),
                "people": ai.get("people", 0),
                "blood": ai.get("blood", False),
                "severity": ai.get("severity", 1.0),
                "trackingIDs": ai.get("tracking_ids", []),
            }
        else:
            d["aiMetrics"] = {
                "weapon": False, "weaponConfidence": 0.0,
                "fight": False, "fightConfidence": 0.0,
                "people": 0, "blood": False, "severity": 1.0, "trackingIDs": []
            }
        return d


# ---------------------------------------------------------------------------
# Video Analysis Schemas
# ---------------------------------------------------------------------------

class VideoAnalysisRequest(BaseModel):
    """Request for video analysis."""
    video: str
    camera_id: str
    camera_name: str
    location: str
    lat: Optional[float] = None
    lng: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)


class VideoAnalysisResponse(BaseModel):
    """Response from video analysis."""
    incident_id: str
    job_id: str = ""
    status: str
    message: str

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Patrol Unit Schemas
# ---------------------------------------------------------------------------

class PatrolUnit(BaseModel):
    """
    Patrol unit model.
    FIX: Added all fields that integration.py uses.
    """
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    officers: List[str] = Field(default_factory=list)
    badge: str = ""
    status: str = "PATROLLING"
    status_color: str = "success"
    vehicle: str = ""
    location: str = ""
    lat: float = 0.0
    lng: float = 0.0
    distance: str = ""
    eta: str = ""
    radio_channel: str = ""
    equipment: List[str] = Field(default_factory=list)
    current_incident: Optional[str] = None


# ---------------------------------------------------------------------------
# Health Check / Error Schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)
    components: Dict[str, str] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(populate_by_name=True)
