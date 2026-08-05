"""
Object Tracker module for Sentinel AI Emergency Response System.
Implements object tracking using ByteTrack from Ultralytics.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict, Tuple
import json
import uuid

import numpy as np
from ultralytics import YOLO
from ultralytics.trackers.byte_tracker import BYTETracker

from config import config
from schemas import DetectionResult, TrackResult
from utils import (
    setup_logger, calculate_distance, calculate_speed,
    calculate_direction, denormalize_bbox, ensure_directory
)


@dataclass
class TrackHistory:
    """History for a single track."""
    track_id: int
    class_name: str
    positions: List[Tuple[float, float]] = field(default_factory=list)
    timestamps: List[float] = field(default_factory=list)
    confidences: List[float] = field(default_factory=list)
    first_frame: int = 0
    last_frame: int = 0
    camera_id: str = ""
    
    def add_position(
        self,
        position: Tuple[float, float],
        timestamp: float,
        confidence: float,
        frame_number: int
    ) -> None:
        """Add a new position to track history."""
        self.positions.append(position)
        self.timestamps.append(timestamp)
        self.confidences.append(confidence)
        self.last_frame = frame_number
    
    def get_duration(self) -> float:
        """Get track duration in seconds."""
        if len(self.timestamps) < 2:
            return 0.0
        return self.timestamps[-1] - self.timestamps[0]
    
    def get_average_confidence(self) -> float:
        """Get average confidence for this track."""
        if not self.confidences:
            return 0.0
        return sum(self.confidences) / len(self.confidences)


class ObjectTracker:
    """
    Object tracker using ByteTrack for persistent object tracking.
    Consumes DetectionResult objects and generates TrackResult objects.
    """
    
    def __init__(self):
        """Initialize object tracker."""
        self.logger = setup_logger("tracker", config)
        
        # Initialize ByteTracker with SimpleNamespace args
        try:
            from types import SimpleNamespace
            args = SimpleNamespace(
                track_high_thresh=0.5,
                track_low_thresh=0.1,
                new_track_thresh=0.6,
                track_buffer=config.model.max_track_age,
                match_thresh=config.model.tracker_iou_threshold,
                fuse_score=True,
                fps=30
            )
            self.tracker = BYTETracker(args=args)
        except Exception as e:
            self.logger.warning(f"BYTETracker initialization with args failed: {e}")
            try:
                from types import SimpleNamespace
                args = SimpleNamespace(
                    track_high_thresh=0.5,
                    track_low_thresh=0.1,
                    new_track_thresh=0.6,
                    track_buffer=30,
                    match_thresh=0.3,
                    fuse_score=True,
                    fps=30
                )
                self.tracker = BYTETracker(args=args)
            except Exception as e2:
                self.logger.warning(f"BYTETracker fallback instantiation: {e2}")
                self.tracker = None
        
        # Track storage
        self.track_results: List[TrackResult] = []
        self.track_histories: Dict[int, TrackHistory] = {}
        self.next_track_id = 1
        
        # Frame state
        self.current_frame_number = 0
        self.camera_id = ""
        
        self.logger.info("Object tracker initialized")
        self.logger.info(f"Tracker type: {config.model.tracker_type}")
        self.logger.info(f"Max track age: {config.model.max_track_age} frames")
    
    def track_detections(
        self,
        detections: List[DetectionResult],
        frame_number: int,
        camera_id: str,
        frame_width: int,
        frame_height: int
    ) -> List[TrackResult]:
        """
        Track objects from detection results.
        
        Args:
            detections: List of detection results
            frame_number: Current frame number
            camera_id: Camera identifier
            frame_width: Frame width in pixels
            frame_height: Frame height in pixels
            
        Returns:
            List of track results for this frame
        """
        self.current_frame_number = frame_number
        self.camera_id = camera_id
        
        if not detections:
            self.tracker.update()
            return []
        
        # Convert detections to format expected by ByteTracker
        # ByteTracker expects: [x1, y1, x2, y2, confidence, class_id]
        detection_boxes = []
        
        for detection in detections:
            # Convert normalized bbox to pixel coordinates
            bbox = detection.bounding_box
            x, y, w, h = denormalize_bbox(
                (bbox.x, bbox.y, bbox.w, bbox.h),
                frame_width,
                frame_height
            )
            
            # Create box in [x1, y1, x2, y2, conf, class_id] format
            # Note: ByteTracker uses x1, y1, x2, y2 format
            detection_boxes.append([
                x, y, x + w, y + h,
                detection.confidence,
                0  # Class ID (simplified for single-class tracking)
            ])
        
        # Update tracker safely across Ultralytics versions
        tracked_objects = []
        try:
            # Try Ultralytics BYTETracker if compatible
            from types import SimpleNamespace
            conf = np.array([d.confidence for d in detections], dtype=np.float32)
            xyxy = np.array([
                denormalize_bbox(
                    (d.bounding_box.x, d.bounding_box.y, d.bounding_box.w, d.bounding_box.h),
                    frame_width, frame_height
                ) for d in detections
            ], dtype=np.float32)
            if len(xyxy) > 0:
                xyxy[:, 2] += xyxy[:, 0]  # convert w to x2
                xyxy[:, 3] += xyxy[:, 1]  # convert h to y2
            cls = np.zeros(len(detections), dtype=np.float32)
            
            mock_results = SimpleNamespace(conf=conf, xyxy=xyxy, cls=cls)
            raw_tracks = self.tracker.update(mock_results)
            for t in raw_tracks:
                tracked_objects.append(t)
        except Exception as e:
            # Fallback distance-based tracking if BYTETracker fails
            self.logger.debug(f"[TRACKER] BYTETracker fallback engaged: {e}")
            for i, det in enumerate(detections):
                bbox = det.bounding_box
                x, y, w, h = denormalize_bbox(
                    (bbox.x, bbox.y, bbox.w, bbox.h),
                    frame_width, frame_height
                )
                center_x = x + w / 2
                center_y = y + h / 2
                current_pos = (center_x, center_y)
                
                # Match nearest existing track
                matched_id = None
                min_dist = float("inf")
                for tid, history in self.track_histories.items():
                    if history.positions:
                        dist = calculate_distance(current_pos, history.positions[-1])
                        if dist < min_dist and dist < 150:
                            min_dist = dist
                            matched_id = tid
                            
                if matched_id is None:
                    matched_id = self.next_track_id
                    self.next_track_id += 1
                    
                track_obj = SimpleNamespace(
                    track_id=matched_id,
                    tlwh=[x, y, w, h],
                    score=det.confidence
                )
                tracked_objects.append(track_obj)
        
        # Process tracked objects
        frame_track_results = []
        
        for track in tracked_objects:
            track_id = int(track.track_id)
            
            # Extract box coordinates (BYTETracker tlwh is top-left x, top-left y, width, height)
            x, y, w, h = track.tlwh
            confidence = track.score
            
            # Calculate center position
            center_x = x + w / 2
            center_y = y + h / 2
            current_position = (center_x, center_y)
            
            # Get previous position from history
            previous_position = None
            speed = None
            movement_direction = None
            
            if track_id in self.track_histories:
                history = self.track_histories[track_id]
                if len(history.positions) > 0:
                    previous_position = history.positions[-1]
                    
                    # Calculate speed and direction
                    if len(history.timestamps) > 0:
                        time_delta = frame_number / 30.0 - history.timestamps[-1]  # Assuming 30 FPS
                        if time_delta > 0:
                            speed = calculate_speed(previous_position, current_position, time_delta)
                            movement_direction = calculate_direction(previous_position, current_position)
            
            # Get trajectory history
            trajectory_history = []
            if track_id in self.track_histories:
                trajectory_history = self.track_histories[track_id].positions.copy()
            trajectory_history.append(current_position)
            
            # Limit trajectory length
            if len(trajectory_history) > config.annotation.trail_length:
                trajectory_history = trajectory_history[-config.annotation.trail_length:]
            
            # Calculate track duration
            track_duration = 0.0
            if track_id in self.track_histories:
                track_duration = self.track_histories[track_id].get_duration()
            
            # Get class name from corresponding detection
            class_name = "unknown"
            for detection in detections:
                # Match by position (simple heuristic)
                det_bbox = detection.bounding_box
                det_x, det_y, det_w, det_h = denormalize_bbox(
                    (det_bbox.x, det_bbox.y, det_bbox.w, det_bbox.h),
                    frame_width,
                    frame_height
                )
                det_center_x = det_x + det_w / 2
                det_center_y = det_y + det_h / 2
                
                if calculate_distance((det_center_x, det_center_y), current_position) < 50:
                    class_name = detection.class_name
                    break
            
            # Create track result
            track_result = TrackResult(
                track_id=track_id,
                frame_number=frame_number,
                timestamp=frame_number / 30.0,  # Assuming 30 FPS
                class_name=class_name,
                current_position=current_position,
                previous_position=previous_position,
                speed=speed,
                movement_direction=movement_direction,
                trajectory_history=trajectory_history,
                track_duration=track_duration,
                confidence=confidence,
                camera_id=camera_id
            )
            
            frame_track_results.append(track_result)
            
            # Update track history
            if track_id not in self.track_histories:
                self.track_histories[track_id] = TrackHistory(
                    track_id=track_id,
                    class_name=class_name,
                    first_frame=frame_number,
                    camera_id=camera_id
                )
            
            self.track_histories[track_id].add_position(
                current_position,
                frame_number / 30.0,
                confidence,
                frame_number
            )
        
        # Add to overall results
        self.track_results.extend(frame_track_results)
        
        # Clean up old tracks
        self._cleanup_old_tracks()
        
        return frame_track_results
    
    def _cleanup_old_tracks(self) -> None:
        """Remove tracks that haven't been updated recently."""
        max_age_frames = config.model.max_track_age * 2  # Allow some buffer
        
        tracks_to_remove = []
        for track_id, history in self.track_histories.items():
            age = self.current_frame_number - history.last_frame
            if age > max_age_frames:
                tracks_to_remove.append(track_id)
        
        for track_id in tracks_to_remove:
            del self.track_histories[track_id]
            self.logger.debug(f"Removed old track: {track_id}")
    
    def get_track_results(self) -> List[TrackResult]:
        """
        Get all track results.
        
        Returns:
            List of track results
        """
        return self.track_results
    
    def get_track_by_id(self, track_id: int) -> Optional[TrackResult]:
        """
        Get most recent result for a specific track ID.
        
        Args:
            track_id: Track ID
            
        Returns:
            Track result or None
        """
        for track_result in reversed(self.track_results):
            if track_result.track_id == track_id:
                return track_result
        return None
    
    def get_track_history(self, track_id: int) -> Optional[TrackHistory]:
        """
        Get full history for a specific track.
        
        Args:
            track_id: Track ID
            
        Returns:
            Track history or None
        """
        return self.track_histories.get(track_id)
    
    def get_all_track_histories(self) -> Dict[int, TrackHistory]:
        """
        Get all track histories.
        
        Returns:
            Dictionary of track histories
        """
        return self.track_histories
    
    def get_active_track_ids(self) -> List[int]:
        """
        Get IDs of currently active tracks.
        
        Returns:
            List of active track IDs
        """
        return list(self.track_histories.keys())
    
    def save_tracking_json(self, output_path: Optional[Path] = None) -> None:
        """
        Save tracking results to JSON file.
        
        Args:
            output_path: Output file path (default: outputs/tracking.json)
        """
        if output_path is None:
            output_path = config.paths.outputs_dir / "tracking.json"
        
        ensure_directory(config.paths.outputs_dir)
        
        tracking_data = {
            "tracks": [t.model_dump() for t in self.track_results],
            "track_count": len(self.track_results),
            "unique_track_ids": list(self.track_histories.keys()),
            "camera_id": self.camera_id
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(tracking_data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Tracking results saved to {output_path}")
    
    def reset(self) -> None:
        """Reset tracker state."""
        self.track_results = []
        self.track_histories = {}
        self.current_frame_number = 0
        self.camera_id = ""
        
        # Reinitialize tracker with updated API
        try:
            self.tracker = BYTETracker(
                track_buffer=config.model.max_track_age,
                match_thresh=config.model.tracker_iou_threshold,
                frame_rate=30
            )
        except TypeError as e:
            # Fallback to minimal parameters if API changed
            self.logger.warning(f"BYTETracker API changed, using fallback: {e}")
            self.tracker = BYTETracker()
        
        self.logger.info("Tracker reset")
    
    def get_statistics(self) -> Dict[str, any]:
        """
        Get tracking statistics.
        
        Returns:
            Dictionary with tracking statistics
        """
        track_durations = [
            history.get_duration()
            for history in self.track_histories.values()
        ]
        
        return {
            "total_tracks": len(self.track_histories),
            "total_track_results": len(self.track_results),
            "active_tracks": len(self.track_histories),
            "average_track_duration": sum(track_durations) / len(track_durations) if track_durations else 0.0,
            "max_track_duration": max(track_durations) if track_durations else 0.0,
            "min_track_duration": min(track_durations) if track_durations else 0.0,
            "camera_id": self.camera_id
        }
