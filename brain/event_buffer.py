"""
Event Buffer module for Sentinel AI Emergency Response System.
Creates continuous events from detections rather than single-frame reasoning.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime
import json
from collections import defaultdict

from config import config
from schemas import DetectionResult, TrackResult, Event
from utils import setup_logger, smooth_confidence, ensure_directory


@dataclass
class ActiveEvent:
    """Represents an event that is currently active."""
    event_type: str
    start_frame: int
    current_frame: int
    confidences: List[float] = field(default_factory=list)
    objects_present: Set[str] = field(default_factory=set)
    tracking_ids: Set[int] = field(default_factory=set)
    camera_id: str = ""
    
    def add_detection(
        self,
        detection: DetectionResult,
        track_id: Optional[int] = None
    ) -> None:
        """Add a detection to this event."""
        self.current_frame = detection.frame_number
        self.confidences.append(detection.confidence)
        self.objects_present.add(detection.class_name)
        if track_id is not None:
            self.tracking_ids.add(track_id)
    
    def get_duration_frames(self) -> int:
        """Get event duration in frames."""
        return self.current_frame - self.start_frame + 1
    
    def get_average_confidence(self) -> float:
        """Get average confidence for this event."""
        if not self.confidences:
            return 0.0
        return sum(self.confidences) / len(self.confidences)
    
    def to_event(self, fps: float = 30.0) -> Event:
        """Convert to Event schema."""
        return Event(
            event_type=self.event_type,
            start_frame=self.start_frame,
            end_frame=self.current_frame,
            duration=self.get_duration_frames() / fps,
            confidence_average=self.get_average_confidence(),
            objects_present=list(self.objects_present),
            tracking_ids=list(self.tracking_ids),
            camera_id=self.camera_id
        )


class EventBuffer:
    """
    Event buffer that creates continuous events from detections.
    Buffers detections over time and generates events when patterns are detected.
    """
    
    def __init__(self):
        """Initialize event buffer."""
        self.logger = setup_logger("event_buffer", config)
        
        # Active events being tracked
        self.active_events: Dict[str, ActiveEvent] = {}
        
        # Completed events
        self.completed_events: List[Event] = []
        
        # Event cooldown tracking
        self.event_cooldowns: Dict[str, int] = {}
        
        # Frame tracking
        self.current_frame = 0
        self.camera_id = ""
        
        self.logger.info("Event buffer initialized")
        self.logger.info(f"Min event duration: {config.event.min_event_duration_frames} frames")
        self.logger.info(f"Event cooldown: {config.event.event_cooldown_frames} frames")
    
    def process_frame(
        self,
        detections: List[DetectionResult],
        tracks: List[TrackResult],
        frame_number: int,
        camera_id: str
    ) -> List[Event]:
        """
        Process a frame of detections and tracks.
        
        Args:
            detections: List of detection results
            tracks: List of track results
            frame_number: Current frame number
            camera_id: Camera identifier
            
        Returns:
            List of newly completed events
        """
        self.current_frame = frame_number
        self.camera_id = camera_id
        
        new_events = []
        
        # Create track ID mapping for quick lookup
        track_id_map = {track.track_id: track for track in tracks}
        
        # Process each detection
        for detection in detections:
            # Determine event type based on detection
            event_type = self._classify_event(detection)
            
            if event_type is None:
                continue
            
            # Check if event is in cooldown
            if self._is_event_in_cooldown(event_type):
                continue
            
            # Find or create active event
            if event_type in self.active_events:
                # Add to existing event
                active_event = self.active_events[event_type]
                
                # Find corresponding track ID
                track_id = self._find_track_for_detection(detection, tracks)
                active_event.add_detection(detection, track_id)
            else:
                # Create new event
                track_id = self._find_track_for_detection(detection, tracks)
                active_event = ActiveEvent(
                    event_type=event_type,
                    start_frame=frame_number,
                    current_frame=frame_number,
                    camera_id=camera_id
                )
                active_event.add_detection(detection, track_id)
                self.active_events[event_type] = active_event
        
        # Update and check active events
        events_to_complete = []
        
        for event_type, active_event in list(self.active_events.items()):
            # Check if event should complete
            if self._should_complete_event(active_event, detections):
                # Complete the event
                event = active_event.to_event(fps=30.0)
                self.completed_events.append(event)
                events_to_complete.append(event_type)
                new_events.append(event)
                
                # Set cooldown
                self.event_cooldowns[event_type] = frame_number + config.event.event_cooldown_frames
                
                self.logger.info(f"Event completed: {event_type} (duration: {event.duration:.2f}s, frames: {active_event.get_duration_frames()})")
        
        # Remove completed events
        for event_type in events_to_complete:
            del self.active_events[event_type]
        
        # Update cooldowns
        self._update_cooldowns()
        
        return new_events
    
    def _classify_event(self, detection: DetectionResult) -> Optional[str]:
        """
        Classify detection into event type.
        
        Args:
            detection: Detection result
            
        Returns:
            Event type string or None
        """
        class_name = detection.class_name.lower()
        confidence = detection.confidence
        
        # Weapon detection
        if "weapon" in class_name or "knife" in class_name or "gun" in class_name:
            if confidence > 0.7:
                return "weapon_detected"
        
        # Baggage/object detection
        if "backpack" in class_name or "suitcase" in class_name or "handbag" in class_name:
            if confidence > 0.6:
                return "unattended_object"
        
        # Fight detection (based on person behavior patterns)
        if "person" in class_name:
            # This would need additional logic to detect fight behavior
            # For now, return None as fight detection requires context
            pass
        
        # Vehicle anomaly
        if class_name in ["car", "truck", "bus", "motorcycle"]:
            # This would need additional logic for anomaly detection
            pass
        
        return None
    
    def _find_track_for_detection(
        self,
        detection: DetectionResult,
        tracks: List[TrackResult]
    ) -> Optional[int]:
        """
        Find track ID for a detection based on position.
        
        Args:
            detection: Detection result
            tracks: List of track results
            
        Returns:
            Track ID or None
        """
        from utils import calculate_distance, denormalize_bbox
        
        # Detection center (normalized)
        det_bbox = detection.bounding_box
        det_center_x = det_bbox.x + det_bbox.w / 2
        det_center_y = det_bbox.y + det_bbox.h / 2
        
        best_track_id = None
        min_distance = float('inf')
        
        for track in tracks:
            if track.class_name.lower() != detection.class_name.lower():
                continue
            
            # Track center (normalized)
            track_center_x = (track.current_position[0] / 1920) * 100  # Assuming 1920 width
            track_center_y = (track.current_position[1] / 1080) * 100  # Assuming 1080 height
            
            distance = calculate_distance(
                (det_center_x, det_center_y),
                (track_center_x, track_center_y)
            )
            
            if distance < min_distance and distance < 20:  # 20% threshold
                min_distance = distance
                best_track_id = track.track_id
        
        return best_track_id
    
    def _should_complete_event(
        self,
        active_event: ActiveEvent,
        current_detections: List[DetectionResult]
    ) -> bool:
        """
        Determine if an event should be completed.
        
        Args:
            active_event: Active event to check
            current_detections: Current frame detections
            
        Returns:
            True if event should complete
        """
        # Check minimum duration
        if active_event.get_duration_frames() < config.event.min_event_duration_frames:
            return False
        
        # Check if event objects are still present
        event_objects = active_event.objects_present
        current_objects = {d.class_name for d in current_detections}
        
        # If no event objects detected in current frame, consider completing
        if not event_objects.intersection(current_objects):
            return True
        
        # Check frame gap
        frame_gap = self.current_frame - active_event.current_frame
        if frame_gap > config.event.min_event_duration_frames:
            return True
        
        return False
    
    def _is_event_in_cooldown(self, event_type: str) -> bool:
        """
        Check if event type is in cooldown period.
        
        Args:
            event_type: Event type to check
            
        Returns:
            True if in cooldown
        """
        if event_type not in self.event_cooldowns:
            return False
        
        return self.current_frame < self.event_cooldowns[event_type]
    
    def _update_cooldowns(self) -> None:
        """Update cooldown states based on current frame."""
        expired_cooldowns = [
            event_type
            for event_type, cooldown_frame in self.event_cooldowns.items()
            if self.current_frame >= cooldown_frame
        ]
        
        for event_type in expired_cooldowns:
            del self.event_cooldowns[event_type]
    
    def get_completed_events(self) -> List[Event]:
        """
        Get all completed events.
        
        Returns:
            List of completed events
        """
        return self.completed_events
    
    def get_active_events(self) -> List[ActiveEvent]:
        """
        Get currently active events.
        
        Returns:
            List of active events
        """
        return list(self.active_events.values())
    
    def save_events_json(self, output_path: Optional[str] = None) -> None:
        """
        Save events to JSON file.
        
        Args:
            output_path: Output file path (default: outputs/events.json)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "events.json")
        
        ensure_directory(config.paths.outputs_dir)
        
        events_data = {
            "events": [e.model_dump() for e in self.completed_events],
            "event_count": len(self.completed_events),
            "camera_id": self.camera_id
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(events_data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Events saved to {output_path}")
    
    def reset(self) -> None:
        """Reset event buffer state."""
        self.active_events = {}
        self.completed_events = []
        self.event_cooldowns = {}
        self.current_frame = 0
        self.camera_id = ""
        
        self.logger.info("Event buffer reset")
    
    def get_statistics(self) -> Dict[str, any]:
        """
        Get event buffer statistics.
        
        Returns:
            Dictionary with statistics
        """
        event_type_counts = defaultdict(int)
        for event in self.completed_events:
            event_type_counts[event.event_type] += 1
        
        return {
            "total_events": len(self.completed_events),
            "active_events": len(self.active_events),
            "events_by_type": dict(event_type_counts),
            "camera_id": self.camera_id
        }
