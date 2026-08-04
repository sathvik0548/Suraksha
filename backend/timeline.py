"""
Timeline module for Sentinel AI Emergency Response System.
Generates chronological events for incident reconstruction.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json

from config import config
from schemas import (
    DetectionResult, TrackResult, Event, Incident,
    TimelineEvent, TimelineEventType
)
from utils import setup_logger, format_timestamp, ensure_directory


class TimelineGenerator:
    """
    Timeline generator that creates chronological event sequences.
    Reconstructs incident progression over time.
    """
    
    def __init__(self):
        """Initialize timeline generator."""
        self.logger = setup_logger("timeline", config)
        
        # Timeline event templates
        self.event_templates = {
            "person_enters": "Person enters area",
            "person_exits": "Person exits area",
            "weapon_detected": "Weapon detected",
            "weapon_visible": "Weapon visible for {duration:.1f}s",
            "fight_detected": "Fight behavior detected",
            "crowd_forms": "Crowd forms ({count} people)",
            "crowd_increases": "Crowd density increasing",
            "intrusion": "Unauthorized entry detected",
            "fire_detected": "Fire/smoke detected",
            "blood_detected": "Blood detected",
            "vehicle_arrives": "Vehicle arrives",
            "vehicle_departs": "Vehicle departs",
            "object_detected": "Object detected",
            "object_unattended": "Object unattended",
            "threat_escalates": "Threat level escalating",
            "alert_generated": "Alert generated",
            "dispatch_initiated": "Dispatch initiated"
        }
        
        self.logger.info("Timeline generator initialized")
    
    def generate_timeline(
        self,
        detections: List[DetectionResult],
        tracks: List[TrackResult],
        events: List[Event],
        incident: Incident,
        start_time: float = 0.0
    ) -> List[TimelineEvent]:
        """
        Generate chronological timeline from incident data.
        
        Args:
            detections: List of detection results
            tracks: List of track results
            events: List of events
            incident: Incident object
            start_time: Start time in seconds
            
        Returns:
            List of timeline events in chronological order
        """
        timeline = []
        
        # Convert detections to timeline events
        detection_events = self._detections_to_timeline(detections, start_time)
        timeline.extend(detection_events)
        
        # Convert events to timeline events
        event_timeline = self._events_to_timeline(events, start_time)
        timeline.extend(event_timeline)
        
        # Convert tracks to timeline events
        track_events = self._tracks_to_timeline(tracks, start_time)
        timeline.extend(track_events)
        
        # Add incident lifecycle events
        lifecycle_events = self._generate_lifecycle_events(incident, start_time)
        timeline.extend(lifecycle_events)
        
        # Sort by timestamp
        timeline.sort(key=lambda e: e.time)
        
        # Add event types
        timeline = self._classify_timeline_events(timeline)
        
        self.logger.info(f"Timeline generated with {len(timeline)} events")
        
        return timeline
    
    def _detections_to_timeline(
        self,
        detections: List[DetectionResult],
        start_time: float
    ) -> List[TimelineEvent]:
        """
        Convert detections to timeline events.
        
        Args:
            detections: List of detection results
            start_time: Start time in seconds
            
        Returns:
            List of timeline events
        """
        events = []
        
        # Group detections by class and time
        detection_groups = {}
        for detection in detections:
            class_name = detection.class_name.lower()
            if class_name not in detection_groups:
                detection_groups[class_name] = []
            detection_groups[class_name].append(detection)
        
        # Generate events for each class
        for class_name, class_detections in detection_groups.items():
            # First detection
            first_detection = min(class_detections, key=lambda d: d.timestamp)
            timestamp = format_timestamp(first_detection.timestamp - start_time)
            
            if class_name == "person":
                events.append(TimelineEvent(
                    time=timestamp,
                    event="Person enters",
                    details=f"First person detected at {format_timestamp(first_detection.timestamp)}",
                    actor="Unknown",
                    type=TimelineEventType.INFO
                ))
            elif class_name == "weapon":
                events.append(TimelineEvent(
                    time=timestamp,
                    event="Weapon detected",
                    details=f"Weapon detected with {first_detection.confidence:.0%} confidence",
                    actor="Unknown",
                    type=TimelineEventType.DANGER
                ))
            elif class_name == "fight":
                events.append(TimelineEvent(
                    time=timestamp,
                    event="Fight detected",
                    details=f"Fight behavior detected with {first_detection.confidence:.0%} confidence",
                    actor="Unknown",
                    type=TimelineEventType.DANGER
                ))
            elif class_name in ["car", "truck", "bus", "motorcycle"]:
                events.append(TimelineEvent(
                    time=timestamp,
                    event="Vehicle detected",
                    details=f"{class_name.capitalize()} detected",
                    actor="Vehicle",
                    type=TimelineEventType.INFO
                ))
            elif class_name in ["backpack", "suitcase", "handbag"]:
                events.append(TimelineEvent(
                    time=timestamp,
                    event="Object detected",
                    details=f"{class_name.capitalize()} detected",
                    actor="Object",
                    type=TimelineEventType.WARNING
                ))
        
        return events
    
    def _events_to_timeline(
        self,
        events: List[Event],
        start_time: float
    ) -> List[TimelineEvent]:
        """
        Convert buffer events to timeline events.
        
        Args:
            events: List of events
            start_time: Start time in seconds
            
        Returns:
            List of timeline events
        """
        timeline_events = []
        
        for event in events:
            start_timestamp = format_timestamp(event.start_frame / 30.0 - start_time)
            
            if event.event_type == "weapon_detected":
                timeline_events.append(TimelineEvent(
                    time=start_timestamp,
                    event="Weapon visible",
                    details=f"Weapon visible for {event.duration:.1f} seconds",
                    actor="Unknown",
                    type=TimelineEventType.DANGER
                ))
            elif event.event_type == "fight_detected":
                timeline_events.append(TimelineEvent(
                    time=start_timestamp,
                    event="Fight in progress",
                    details=f"Physical altercation lasted {event.duration:.1f} seconds",
                    actor="Unknown",
                    type=TimelineEventType.DANGER
                ))
            elif event.event_type == "crowd_formation":
                timeline_events.append(TimelineEvent(
                    time=start_timestamp,
                    event="Crowd forms",
                    details=f"Crowd of {len(event.objects_present)} people detected",
                    actor="Crowd",
                    type=TimelineEventType.WARNING
                ))
            elif event.event_type == "intrusion":
                timeline_events.append(TimelineEvent(
                    time=start_timestamp,
                    event="Intrusion detected",
                    details="Unauthorized entry in restricted area",
                    actor="Intruder",
                    type=TimelineEventType.DANGER
                ))
            elif event.event_type == "fire_detected":
                timeline_events.append(TimelineEvent(
                    time=start_timestamp,
                    event="Fire detected",
                    details="Fire or smoke detected",
                    actor="Unknown",
                    type=TimelineEventType.DANGER
                ))
            elif event.event_type == "unattended_object":
                timeline_events.append(TimelineEvent(
                    time=start_timestamp,
                    event="Object unattended",
                    details=f"Unattended object for {event.duration:.1f} seconds",
                    actor="Object",
                    type=TimelineEventType.WARNING
                ))
        
        return timeline_events
    
    def _tracks_to_timeline(
        self,
        tracks: List[TrackResult],
        start_time: float
    ) -> List[TimelineEvent]:
        """
        Convert tracks to timeline events.
        
        Args:
            tracks: List of track results
            start_time: Start time in seconds
            
        Returns:
            List of timeline events
        """
        events = []
        
        # Group tracks by ID
        track_groups = {}
        for track in tracks:
            if track.track_id not in track_groups:
                track_groups[track.track_id] = []
            track_groups[track.track_id].append(track)
        
        # Generate events for each track
        for track_id, track_data in track_groups.items():
            # First appearance
            first_track = min(track_data, key=lambda t: t.frame_number)
            timestamp = format_timestamp(first_track.timestamp - start_time)
            
            events.append(TimelineEvent(
                time=timestamp,
                event=f"Track {track_id} starts",
                details=f"{first_track.class_name.capitalize()} tracking begins",
                actor=f"Track {track_id}",
                type=TimelineEventType.INFO
            ))
            
            # Check for notable movement
            high_speed_tracks = [t for t in track_data if t.speed and t.speed > 50]
            if high_speed_tracks:
                fastest = max(high_speed_tracks, key=lambda t: t.speed)
                events.append(TimelineEvent(
                    time=format_timestamp(fastest.timestamp - start_time),
                    event=f"Track {track_id} high speed",
                    details=f"Rapid movement detected ({fastest.speed:.1f} px/s)",
                    actor=f"Track {track_id}",
                    type=TimelineEventType.WARNING
                ))
        
        return events
    
    def _generate_lifecycle_events(
        self,
        incident: Incident,
        start_time: float
    ) -> List[TimelineEvent]:
        """
        Generate incident lifecycle events.
        
        Args:
            incident: Incident object
            start_time: Start time in seconds
            
        Returns:
            List of timeline events
        """
        events = []
        
        # Incident start
        events.append(TimelineEvent(
            time="00:00",
            event="Incident begins",
            details=f"Incident detected at {incident.location}",
            actor="System",
            type=TimelineEventType.INFO
        ))
        
        # Threat escalation
        if incident.severity >= 7.0:
            events.append(TimelineEvent(
                time="00:05",
                event="Threat escalated",
                details=f"Severity level raised to {incident.severity_level.value}",
                actor="System",
                type=TimelineEventType.DANGER
            ))
        
        # Alert generation
        events.append(TimelineEvent(
            time="00:10",
            event="Alert generated",
            details="Emergency alert created and queued",
            actor="System",
            type=TimelineEventType.DISPATCH
        ))
        
        return events
    
    def _classify_timeline_events(self, timeline: List[TimelineEvent]) -> List[TimelineEvent]:
        """
        Classify timeline events by type.
        
        Args:
            timeline: List of timeline events
            
        Returns:
            List of timeline events with types
        """
        for event in timeline:
            # Classify based on event content
            event_lower = event.event.lower()
            
            if any(keyword in event_lower for keyword in ["weapon", "fight", "fire", "blood", "intrusion"]):
                event.type = TimelineEventType.DANGER
            elif any(keyword in event_lower for keyword in ["alert", "dispatch"]):
                event.type = TimelineEventType.DISPATCH
            elif any(keyword in event_lower for keyword in ["crowd", "unattended", "speed"]):
                event.type = TimelineEventType.WARNING
            else:
                event.type = TimelineEventType.INFO
        
        return timeline
    
    def get_timeline_summary(self, timeline: List[TimelineEvent]) -> Dict[str, any]:
        """
        Get summary of timeline events.
        
        Args:
            timeline: List of timeline events
            
        Returns:
            Dictionary with timeline summary
        """
        if not timeline:
            return {
                "total_events": 0,
                "by_type": {},
                "duration": "00:00"
            }
        
        # Count by type
        type_counts = {}
        for event in timeline:
            type_counts[event.type.value] = type_counts.get(event.type.value, 0) + 1
        
        # Calculate duration
        duration = timeline[-1].time if timeline else "00:00"
        
        return {
            "total_events": len(timeline),
            "by_type": type_counts,
            "duration": duration,
            "first_event": timeline[0].event,
            "last_event": timeline[-1].event
        }
    
    def save_timeline_json(self, timeline: List[TimelineEvent], output_path: Optional[str] = None) -> None:
        """
        Save timeline to JSON file.
        
        Args:
            timeline: List of timeline events
            output_path: Output file path (default: outputs/timeline.json)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "timeline.json")
        
        ensure_directory(config.paths.outputs_dir)
        
        timeline_data = {
            "timeline": [e.model_dump() for e in timeline],
            "summary": self.get_timeline_summary(timeline)
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(timeline_data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Timeline saved to {output_path}")
    
    def reset(self) -> None:
        """Reset timeline generator state."""
        self.logger.info("Timeline generator reset")
