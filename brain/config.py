"""
Configuration module for Sentinel AI Emergency Response System.
Contains all configuration classes using clean architecture principles.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
import os


@dataclass
class PathsConfig:
    """Configuration for all file system paths."""
    
    base_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent)
    brain_dir: Path = field(default_factory=lambda: Path(__file__).parent)
    models_dir: Path = field(default_factory=lambda: Path(__file__).parent / "models")
    uploads_dir: Path = field(default_factory=lambda: Path(__file__).parent / "uploads")
    outputs_dir: Path = field(default_factory=lambda: Path(__file__).parent / "outputs")
    logs_dir: Path = field(default_factory=lambda: Path(__file__).parent / "logs")
    
    def __post_init__(self):
        """Ensure all directories exist."""
        for dir_path in [self.models_dir, self.uploads_dir, self.outputs_dir, self.logs_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)


@dataclass
class ModelConfig:
    """Configuration for AI models."""
    
    # YOLO11 Detection Model
    yolo_model_name: str = "yolo11m.pt"
    yolo_confidence_threshold: float = 0.5
    yolo_iou_threshold: float = 0.45
    yolo_device: str = "cpu"  # or "cuda" if GPU available
    
    # Tracking
    tracker_type: str = "bytetrack"
    tracker_confidence_threshold: float = 0.5
    tracker_iou_threshold: float = 0.3
    max_track_age: int = 30  # frames
    
    # Classes to detect
    detection_classes: List[str] = field(default_factory=lambda: [
        "person", "car", "bus", "truck", "motorcycle", 
        "bicycle", "backpack", "suitcase", "handbag"
    ])


@dataclass
class VideoConfig:
    """Configuration for video processing."""
    
    supported_formats: List[str] = field(default_factory=lambda: [".mp4", ".avi", ".mov", ".mkv"])
    target_fps: int = 30
    max_resolution: tuple = (1920, 1080)
    annotation_fps: int = 30
    codec: str = "mp4v"
    
    # Processing
    batch_size: int = 1
    skip_frames: int = 0  # Process every frame if 0


@dataclass
class SeverityConfig:
    """Configuration for severity scoring."""
    
    min_severity: float = 1.0
    max_severity: float = 10.0
    severity_levels: dict = field(default_factory=lambda: {
        "CRITICAL": (8.0, 10.0),
        "HIGH": (6.0, 7.9),
        "MEDIUM": (4.0, 5.9),
        "LOW": (1.0, 3.9)
    })
    
    # Weights for different factors
    weapon_weight: float = 3.0
    violence_weight: float = 2.5
    crowd_density_weight: float = 1.5
    restricted_area_weight: float = 2.0
    duration_weight: float = 1.0
    night_time_weight: float = 1.2
    tracking_behavior_weight: float = 0.8


@dataclass
class EventConfig:
    """Configuration for event buffering."""
    
    min_event_duration_frames: int = 10  # Minimum frames to consider an event
    event_cooldown_frames: int = 30  # Frames before same event can trigger again
    confidence_smoothing_window: int = 5  # Frames for averaging confidence
    
    # Event types
    event_types: List[str] = field(default_factory=lambda: [
        "weapon_detected", "fight_detected", "crowd_formation",
        "intrusion", "fire_detected", "vehicle_anomaly",
        "unattended_object", "blood_detected"
    ])


@dataclass
class APIConfig:
    """Configuration for FastAPI server."""
    
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    cors_origins: List[str] = field(default_factory=lambda: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ])
    
    # Rate limiting
    max_upload_size: int = 500 * 1024 * 1024  # 500MB
    request_timeout: int = 300  # 5 minutes
    
    # API versioning
    api_version: str = "v1"
    api_prefix: str = "/api/v1"


@dataclass
class DatabaseConfig:
    """Configuration for database operations."""
    
    # Using JSON file-based storage for simplicity
    # Can be extended to use PostgreSQL/SQLite in future
    storage_type: str = "json"
    data_dir: Path = field(default_factory=lambda: Path(__file__).parent / "outputs")
    
    # Retention policy
    max_incidents_stored: int = 1000
    max_detections_stored: int = 10000
    data_retention_days: int = 30


@dataclass
class LoggingConfig:
    """Configuration for logging."""
    
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_file: str = "sentinel_ai.log"
    
    # Log rotation
    max_log_size_mb: int = 10
    backup_count: int = 5
    
    # Console logging
    console_logging: bool = True
    file_logging: bool = True


@dataclass
class AnnotationConfig:
    """Configuration for video annotation/overlay."""
    
    # Colors in BGR format (for OpenCV)
    colors: dict = field(default_factory=lambda: {
        "person": (59, 130, 246),      # Blue
        "car": (16, 185, 129),         # Green
        "bus": (5, 150, 105),          # Dark Green
        "truck": (245, 158, 11),       # Orange
        "motorcycle": (239, 68, 68),   # Red
        "bicycle": (139, 92, 246),     # Purple
        "backpack": (236, 72, 153),    # Pink
        "suitcase": (234, 179, 8),     # Yellow
        "handbag": (20, 184, 166),     # Teal
        "weapon": (220, 38, 38),       # Dark Red
        "fight": (249, 115, 22),       # Orange
        "default": (255, 255, 255)     # White
    })
    
    # Annotation settings
    bbox_thickness: int = 2
    bbox_line_type: int = 2  # CV_AA (anti-aliased)
    font_scale: float = 0.6
    font_thickness: int = 2
    label_padding: int = 5
    
    # Trail settings
    trail_length: int = 20  # Number of frames to show trail
    trail_thickness: int = 2
    trail_alpha: float = 0.5  # Transparency
    
    # UI elements
    show_camera_name: bool = True
    show_timestamp: bool = True
    show_rec_indicator: bool = True
    show_fps: bool = True
    show_frame_counter: bool = True
    show_ai_status: bool = True
    
    # UI positions (as percentages of frame size)
    camera_name_position: tuple = (0.02, 0.05)
    timestamp_position: tuple = (0.02, 0.10)
    fps_position: tuple = (0.85, 0.05)
    frame_counter_position: tuple = (0.85, 0.10)
    ai_status_position: tuple = (0.02, 0.15)


@dataclass
class Config:
    """Main configuration class that aggregates all sub-configurations."""
    
    paths: PathsConfig = field(default_factory=PathsConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    video: VideoConfig = field(default_factory=VideoConfig)
    severity: SeverityConfig = field(default_factory=SeverityConfig)
    event: EventConfig = field(default_factory=EventConfig)
    api: APIConfig = field(default_factory=APIConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    annotation: AnnotationConfig = field(default_factory=AnnotationConfig)
    
    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        config = cls()
        
        # Override with environment variables if present
        if os.getenv("SENTINEL_API_HOST"):
            config.api.host = os.getenv("SENTINEL_API_HOST")
        if os.getenv("SENTINEL_API_PORT"):
            config.api.port = int(os.getenv("SENTINEL_API_PORT"))
        if os.getenv("SENTINEL_LOG_LEVEL"):
            config.logging.log_level = os.getenv("SENTINEL_LOG_LEVEL")
        if os.getenv("SENTINEL_MODEL_DEVICE"):
            config.model.yolo_device = os.getenv("SENTINEL_MODEL_DEVICE")
            
        return config


# Global configuration instance
config = Config.from_env()
