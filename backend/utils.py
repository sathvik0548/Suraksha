"""
Utility functions for Sentinel AI Emergency Response System.
Reusable helper functions for common operations.
"""

import json
import logging
import logging.handlers
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import cv2
import numpy as np


# Logging setup
def setup_logger(name: str, config) -> logging.Logger:
    """
    Set up a logger with specified configuration.
    
    Args:
        name: Logger name
        config: Global Config object containing logging configuration
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, config.logging.log_level))
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(config.logging.log_format)
    
    # Console handler
    if config.logging.console_logging:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    # File handler
    if config.logging.file_logging:
        log_file = config.paths.logs_dir / config.logging.log_file
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=config.logging.max_log_size_mb * 1024 * 1024,
            backupCount=config.logging.backup_count
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# File I/O utilities
def save_json(data: Any, filepath: Path) -> None:
    """
    Save data to JSON file.
    
    Args:
        data: Data to save
        filepath: Target file path
    """
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=str, ensure_ascii=False)


def load_json(filepath: Path) -> Optional[Dict[str, Any]]:
    """
    Load data from JSON file.
    
    Args:
        filepath: Source file path
        
    Returns:
        Loaded data or None if file doesn't exist
    """
    if not filepath.exists():
        return None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def ensure_directory(path: Path) -> None:
    """
    Ensure directory exists, create if it doesn't.
    
    Args:
        path: Directory path
    """
    path.mkdir(parents=True, exist_ok=True)


# Video utilities
def get_video_info(video_path: Path) -> Dict[str, Any]:
    """
    Get video file information.
    
    Args:
        video_path: Path to video file
        
    Returns:
        Dictionary with video properties
    """
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")
    
    info = {
        'fps': cap.get(cv2.CAP_PROP_FPS),
        'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        'duration': cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)
    }
    
    cap.release()
    return info


def create_video_writer(
    output_path: Path,
    fps: float,
    frame_size: Tuple[int, int],
    codec: str = 'mp4v'
) -> cv2.VideoWriter:
    """
    Create video writer with specified parameters.
    
    Args:
        output_path: Output video path
        fps: Frames per second
        frame_size: Frame size as (width, height)
        codec: Video codec
        
    Returns:
        VideoWriter instance
    """
    fourcc = cv2.VideoWriter_fourcc(*codec)
    return cv2.VideoWriter(str(output_path), fourcc, fps, frame_size)


# Image processing utilities
def resize_frame(
    frame: np.ndarray,
    target_size: Optional[Tuple[int, int]] = None,
    max_dimension: int = 1920
) -> np.ndarray:
    """
    Resize frame while maintaining aspect ratio.
    
    Args:
        frame: Input frame
        target_size: Target size (width, height) or None
        max_dimension: Maximum dimension if target_size is None
        
    Returns:
        Resized frame
    """
    if target_size:
        return cv2.resize(frame, target_size)
    
    h, w = frame.shape[:2]
    if max(h, w) <= max_dimension:
        return frame
    
    scale = max_dimension / max(h, w)
    new_size = (int(w * scale), int(h * scale))
    return cv2.resize(frame, new_size)


def normalize_bbox(
    bbox: Tuple[float, float, float, float],
    frame_width: int,
    frame_height: int
) -> Tuple[float, float, float, float]:
    """
    Convert bounding box from pixels to percentages.
    
    Args:
        bbox: Bounding box as (x, y, w, h) in pixels
        frame_width: Frame width in pixels
        frame_height: Frame height in pixels
        
    Returns:
        Normalized bbox as (x, y, w, h) in percentages
    """
    x, y, w, h = bbox
    return (
        (x / frame_width) * 100,
        (y / frame_height) * 100,
        (w / frame_width) * 100,
        (h / frame_height) * 100
    )


def denormalize_bbox(
    bbox: Tuple[float, float, float, float],
    frame_width: int,
    frame_height: int
) -> Tuple[int, int, int, int]:
    """
    Convert bounding box from percentages to pixels.
    
    Args:
        bbox: Bounding box as (x, y, w, h) in percentages
        frame_width: Frame width in pixels
        frame_height: Frame height in pixels
        
    Returns:
        Denormalized bbox as (x, y, w, h) in pixels
    """
    x, y, w, h = bbox
    return (
        int((x / 100) * frame_width),
        int((y / 100) * frame_height),
        int((w / 100) * frame_width),
        int((h / 100) * frame_height)
    )


# Math utilities
def calculate_distance(
    point1: Tuple[float, float],
    point2: Tuple[float, float]
) -> float:
    """
    Calculate Euclidean distance between two points.
    
    Args:
        point1: First point (x, y)
        point2: Second point (x, y)
        
    Returns:
        Euclidean distance
    """
    return np.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)


def calculate_speed(
    position1: Tuple[float, float],
    position2: Tuple[float, float],
    time_delta: float
) -> float:
    """
    Calculate speed between two positions.
    
    Args:
        position1: First position (x, y)
        position2: Second position (x, y)
        time_delta: Time difference in seconds
        
    Returns:
        Speed in pixels per second
    """
    if time_delta == 0:
        return 0.0
    
    distance = calculate_distance(position1, position2)
    return distance / time_delta


def calculate_direction(
    position1: Tuple[float, float],
    position2: Tuple[float, float]
) -> str:
    """
    Calculate movement direction between two points.
    
    Args:
        position1: First position (x, y)
        position2: Second position (x, y)
        
    Returns:
        Direction string (N, S, E, W, NE, NW, SE, SW, or None)
    """
    dx = position2[0] - position1[0]
    dy = position2[1] - position1[1]
    
    if abs(dx) < 5 and abs(dy) < 5:
        return "STATIONARY"
    
    angle = np.degrees(np.arctan2(dy, dx))
    
    # Convert angle to direction
    if -22.5 <= angle < 22.5:
        return "E"
    elif 22.5 <= angle < 67.5:
        return "SE"
    elif 67.5 <= angle < 112.5:
        return "S"
    elif 112.5 <= angle < 157.5:
        return "SW"
    elif 157.5 <= angle <= 180 or -180 <= angle < -157.5:
        return "W"
    elif -157.5 <= angle < -112.5:
        return "NW"
    elif -112.5 <= angle < -67.5:
        return "N"
    else:  # -67.5 <= angle < -22.5
        return "NE"


def calculate_iou(
    bbox1: Tuple[float, float, float, float],
    bbox2: Tuple[float, float, float, float]
) -> float:
    """
    Calculate Intersection over Union (IoU) for two bounding boxes.
    
    Args:
        bbox1: First bbox (x, y, w, h)
        bbox2: Second bbox (x, y, w, h)
        
    Returns:
        IoU score
    """
    x1, y1, w1, h1 = bbox1
    x2, y2, w2, h2 = bbox2
    
    # Calculate intersection
    x_left = max(x1, x2)
    y_top = max(y1, y2)
    x_right = min(x1 + w1, x2 + w2)
    y_bottom = min(y1 + h1, y2 + h2)
    
    if x_right < x_left or y_bottom < y_top:
        return 0.0
    
    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    
    # Calculate union
    bbox1_area = w1 * h1
    bbox2_area = w2 * h2
    union_area = bbox1_area + bbox2_area - intersection_area
    
    return intersection_area / union_area if union_area > 0 else 0.0


# Time utilities
def format_timestamp(seconds: float) -> str:
    """
    Format timestamp in seconds to HH:MM:SS format.
    
    Args:
        seconds: Timestamp in seconds
        
    Returns:
        Formatted timestamp string
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def format_time_ago(timestamp: datetime) -> str:
    """
    Format datetime as "time ago" string.
    
    Args:
        timestamp: Datetime object
        
    Returns:
        Formatted "time ago" string
    """
    now = datetime.now()
    delta = now - timestamp
    
    if delta < timedelta(minutes=1):
        return "Just now"
    elif delta < timedelta(hours=1):
        minutes = int(delta.total_seconds() / 60)
        return f"{minutes} min ago"
    elif delta < timedelta(days=1):
        hours = int(delta.total_seconds() / 3600)
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    else:
        days = delta.days
        return f"{days} day{'s' if days > 1 else ''} ago"


def get_current_timestamp() -> str:
    """
    Get current timestamp in ISO format.
    
    Returns:
        ISO formatted timestamp
    """
    return datetime.now().isoformat()


# Color utilities
def get_color_by_class(class_name: str, color_map: Dict[str, Tuple[int, int, int]]) -> Tuple[int, int, int]:
    """
    Get color for a given class name.
    
    Args:
        class_name: Class name
        color_map: Color mapping dictionary
        
    Returns:
        BGR color tuple
    """
    return color_map.get(class_name.lower(), color_map.get("default", (255, 255, 255)))


def generate_color(index: int, total: int) -> Tuple[int, int, int]:
    """
    Generate a unique color based on index.
    
    Args:
        index: Color index
        total: Total number of colors
        
    Returns:
        BGR color tuple
    """
    hue = (index / total) * 360
    color = cv2.cvtColor(np.uint8([[[hue, 255, 255]]]), cv2.COLOR_HSV2BGR)[0][0]
    return tuple(int(c) for c in color)


# String utilities
def generate_unique_id(prefix: str = "OBJ") -> str:
    """
    Generate a unique identifier.
    
    Args:
        prefix: ID prefix
        
    Returns:
        Unique ID string
    """
    import uuid
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing invalid characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename


# Statistics utilities
def calculate_fps(
    frame_count: int,
    start_time: float,
    end_time: float
) -> float:
    """
    Calculate processing FPS.
    
    Args:
        frame_count: Number of frames processed
        start_time: Start timestamp
        end_time: End timestamp
        
    Returns:
        FPS value
    """
    duration = end_time - start_time
    return frame_count / duration if duration > 0 else 0.0


def smooth_confidence(
    confidences: List[float],
    window_size: int = 5
) -> float:
    """
    Smooth confidence values using moving average.
    
    Args:
        confidences: List of confidence values
        window_size: Window size for moving average
        
    Returns:
        Smoothed confidence value
    """
    if not confidences:
        return 0.0
    
    window = confidences[-window_size:]
    return sum(window) / len(window)


# Validation utilities
def validate_video_file(filepath: Path, allowed_extensions: List[str]) -> bool:
    """
    Validate video file format.
    
    Args:
        filepath: Path to video file
        allowed_extensions: List of allowed extensions
        
    Returns:
        True if valid, False otherwise
    """
    if not filepath.exists():
        return False
    
    return filepath.suffix.lower() in [ext.lower() for ext in allowed_extensions]


def validate_bbox(bbox: Tuple[float, float, float, float]) -> bool:
    """
    Validate bounding box values.
    
    Args:
        bbox: Bounding box (x, y, w, h)
        
    Returns:
        True if valid, False otherwise
    """
    x, y, w, h = bbox
    return all(v >= 0 for v in [x, y, w, h]) and w > 0 and h > 0


# Performance utilities
class Timer:
    """Context manager for timing operations."""
    
    def __init__(self, name: str = "Operation"):
        self.name = name
        self.start_time = None
        self.end_time = None
        self.elapsed = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args):
        self.end_time = time.time()
        self.elapsed = self.end_time - self.start_time
        print(f"{self.name} completed in {self.elapsed:.4f} seconds")


def format_bytes(bytes_size: int) -> str:
    """
    Format bytes to human-readable string.
    
    Args:
        bytes_size: Size in bytes
        
    Returns:
        Formatted string
    """
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} TB"
