"""
Coordinator module for Sentinel AI Emergency Response System.
Intelligence layer that combines detections across time to generate incident objects.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Set
from datetime import datetime
import json
from collections import defaultdict

from config import config
from schemas import (
    DetectionResult, TrackResult, Event, Incident,
    SeverityLevel, IncidentStatus, AiMetrics, EvidenceItem
)
from utils import setup_logger, format_timestamp, ensure_directory


@dataclass
class IncidentContext:
    """Context for incident generation."""
    detections: List[DetectionResult]
    tracks: List[TrackResult]
    events: List[Event]
    camera_id: str
    camera_name: str
    location: str
    lat: float
    lng: float
    
    def get_unique_objects(self) -> Set[str]:
        """Get unique object types detected."""
        return {d.class_name for d in self.detections}
    
    def get_unique_track_ids(self) -> Set[int]:
        """Get unique tracking IDs."""
        return {t.track_id for t in self.tracks}
    
    def get_people_count(self) -> int:
        """Count person detections."""
        return sum(1 for d in self.detections if d.class_name.lower() == "person")
    
    def get_vehicle_count(self) -> int:
        """Count vehicle detections."""
        vehicle_classes = {"car", "truck", "bus", "motorcycle", "bicycle"}
        return sum(1 for d in self.detections if d.class_name.lower() in vehicle_classes)
    
    def has_weapon(self) -> bool:
        """Check if weapon was detected."""
        return any("weapon" in d.class_name.lower() for d in self.detections)
    
    def has_fight(self) -> bool:
        """Check if fight behavior was detected."""
        return any("fight" in d.class_name.lower() for d in self.detections)
    
    def has_blood(self) -> bool:
        """Check if blood was detected."""
        return any("blood" in d.class_name.lower() for d in self.detections)
    
    def get_event_types(self) -> Set[str]:
        """Get unique event types."""
        return {e.event_type for e in self.events}


class IncidentCoordinator:
    """
    Intelligence layer that combines detections across time.
    Never reasons from a single frame - combines temporal data.
    """
    
    def __init__(self):
        """Initialize incident coordinator."""
        self.logger = setup_logger("coordinator", config)
        
        # Incident storage
        self.generated_incidents: List[Incident] = []
        
        # Threat classification rules
        self.threat_categories = {
            "weapon_detected": {"severity": 9.0, "level": SeverityLevel.CRITICAL},
            "fight_detected": {"severity": 7.5, "level": SeverityLevel.HIGH},
            "crowd_formation": {"severity": 5.0, "level": SeverityLevel.MEDIUM},
            "intrusion": {"severity": 8.0, "level": SeverityLevel.HIGH},
            "fire_detected": {"severity": 9.5, "level": SeverityLevel.CRITICAL},
            "vehicle_anomaly": {"severity": 6.0, "level": SeverityLevel.MEDIUM},
            "unattended_object": {"severity": 4.0, "level": SeverityLevel.MEDIUM},
            "blood_detected": {"severity": 8.5, "level": SeverityLevel.CRITICAL}
        }
        
        self.logger.info("Incident coordinator initialized")
    
    def analyze_context(
        self,
        detections: List[DetectionResult],
        tracks: List[TrackResult],
        events: List[Event],
        camera_id: str,
        camera_name: str,
        location: str,
        lat: float,
        lng: float
    ) -> Optional[Incident]:
        """
        Analyze context and generate incident if warranted.
        
        Args:
            detections: List of detection results
            tracks: List of track results
            events: List of events
            camera_id: Camera identifier
            camera_name: Camera name
            location: Camera location
            lat: Latitude
            lng: Longitude
            
        Returns:
            Incident object or None if no incident
        """
        if not detections and not events:
            self.logger.debug("No detections or events - skipping incident generation")
            return None
        
        # Create context
        context = IncidentContext(
            detections=detections,
            tracks=tracks,
            events=events,
            camera_id=camera_id,
            camera_name=camera_name,
            location=location,
            lat=lat,
            lng=lng
        )
        
        # Determine if incident should be generated
        if not self._should_generate_incident(context):
            self.logger.debug("Context does not warrant incident generation")
            return None
        
        # Generate incident
        incident = self._generate_incident(context)
        
        if incident:
            self.generated_incidents.append(incident)
            self.logger.info(f"Incident generated: {incident.id} - {incident.title}")
        
        return incident
    
    def _should_generate_incident(self, context: IncidentContext) -> bool:
        """
        Determine if context warrants incident generation.
        
        FIXED: Lowered thresholds so real COCO-class detections (person, car,
        backpack, etc.) always produce an incident. YOLO11m detects COCO-80
        classes — none are named 'weapon' or 'fight', so we use object-count
        and multi-class presence as the primary signal.
        
        Args:
            context: Incident context
            
        Returns:
            True if incident should be generated
        """
        # Always generate if there are any detections at all (production rule)
        if context.detections:
            self.logger.info(
                f"[COORDINATOR] Generating incident: {len(context.detections)} detections, "
                f"unique classes={context.get_unique_objects()}"
            )
            return True

        # Check for critical events from event buffer
        event_types = context.get_event_types()
        critical_events = {
            "weapon_detected", "fight_detected", "intrusion",
            "fire_detected", "blood_detected", "unattended_object"
        }
        if critical_events.intersection(event_types):
            return True

        self.logger.debug("[COORDINATOR] No detections or critical events — skipping incident")
        return False
    
    def _generate_incident(self, context: IncidentContext) -> Incident:
        """
        Generate incident from context.
        
        Args:
            context: Incident context
            
        Returns:
            Incident object
        """
        # Determine incident type and title
        incident_type, title = self._classify_incident_type(context)
        
        # Determine severity level and score
        severity_score, severity_level = self._calculate_severity(context)
        
        # Generate AI metrics
        ai_metrics = self._generate_ai_metrics(context)
        
        # Generate evidence items
        evidence_gallery = self._generate_evidence(context)
        
        # Create incident — all fields use current schema field names
        incident = Incident(
            title=title,
            location=context.location,
            station="Central Command",
            timestamp=datetime.now(),
            severity=severity_score,
            severity_level=severity_level,
            status=IncidentStatus.ACTIVE,
            camera=context.camera_name,
            camera_id=context.camera_id,
            assigned_unit="",
            lat=context.lat,
            lng=context.lng,
            ai_analysis=ai_metrics,
            description=self._generate_description(context, incident_type),
            evidence_gallery=evidence_gallery
        )
        self.logger.info(
            f"[COORDINATOR] Incident object created: id={incident.id}, "
            f"title={incident.title}, severity={incident.severity:.1f}, "
            f"level={incident.severity_level.value}"
        )
        
        return incident
    
    def _classify_incident_type(self, context: IncidentContext) -> tuple:
        """
        Classify incident type and generate title.
        
        Args:
            context: Incident context
            
        Returns:
            Tuple of (incident_type, title)
        """
        event_types = context.get_event_types()
        
        # Priority-based classification
        if "weapon_detected" in event_types:
            return "weapon", f"Weapon Detected - {context.camera_name}"
        elif "fight_detected" in event_types:
            return "fight", f"Physical Altercation - {context.camera_name}"
        elif "fire_detected" in event_types:
            return "fire", f"Fire Detected - {context.camera_name}"
        elif "blood_detected" in event_types:
            return "injury", f"Potential Injury - {context.camera_name}"
        elif "intrusion" in event_types:
            return "intrusion", f"Unauthorized Entry - {context.camera_name}"
        elif "unattended_object" in event_types:
            return "suspicious_object", f"Suspicious Object - {context.camera_name}"
        elif "crowd_formation" in event_types:
            people_count = context.get_people_count()
            return "crowd", f"Large Crowd ({people_count} people) - {context.camera_name}"
        else:
            return "anomaly", f"Anomalous Activity - {context.camera_name}"
    
    def _calculate_severity(self, context: IncidentContext) -> tuple:
        """
        Calculate severity score and level.
        
        Args:
            context: Incident context
            
        Returns:
            Tuple of (severity_score, severity_level)
        """
        base_severity = 1.0
        event_types = context.get_event_types()
        
        # Add severity based on event types
        for event_type in event_types:
            if event_type in self.threat_categories:
                base_severity = max(base_severity, self.threat_categories[event_type]["severity"])
        
        # Adjust based on context
        if context.has_weapon():
            base_severity += 2.0
        
        if context.has_fight():
            base_severity += 1.5
        
        if context.has_blood():
            base_severity += 1.0
        
        # Adjust based on crowd size
        people_count = context.get_people_count()
        if people_count > 20:
            base_severity += 1.0
        elif people_count > 10:
            base_severity += 0.5
        
        # Ensure within bounds
        base_severity = max(config.severity.min_severity, min(config.severity.max_severity, base_severity))
        
        # Determine severity level
        severity_level = self._get_severity_level(base_severity)
        
        return base_severity, severity_level
    
    def _get_severity_level(self, score: float) -> SeverityLevel:
        """
        Get severity level from score.
        
        Args:
            score: Severity score
            
        Returns:
            Severity level enum
        """
        for level, (min_score, max_score) in config.severity.severity_levels.items():
            if min_score <= score <= max_score:
                return SeverityLevel(level)
        
        return SeverityLevel.LOW
    
    def _generate_ai_metrics(self, context: IncidentContext) -> AiMetrics:
        """
        Generate AI metrics from context.
        
        Args:
            context: Incident context
            
        Returns:
            AI metrics object
        """
        # Calculate weapon confidence
        weapon_detections = [d for d in context.detections if "weapon" in d.class_name.lower()]
        weapon_confidence = max([d.confidence for d in weapon_detections]) if weapon_detections else 0.0
        
        # Calculate fight confidence
        fight_detections = [d for d in context.detections if "fight" in d.class_name.lower()]
        fight_confidence = max([d.confidence for d in fight_detections]) if fight_detections else 0.0
        
        # Count people
        people_count = context.get_people_count()
        
        # Check for blood
        has_blood = context.has_blood()
        
        # Calculate overall severity
        severity_score, _ = self._calculate_severity(context)
        
        # Get tracking IDs
        tracking_ids = list(context.get_unique_track_ids())
        
        return AiMetrics(
            weapon=context.has_weapon(),
            weapon_confidence=weapon_confidence * 100,
            fight=context.has_fight(),
            fight_confidence=fight_confidence * 100,
            people=people_count,
            blood=has_blood,
            severity=severity_score,
            tracking_ids=tracking_ids
        )
    
    def _generate_evidence(self, context: IncidentContext) -> List[EvidenceItem]:
        """
        Generate evidence items from context.
        
        FIXED: Uses correct EvidenceItem field names matching schemas.py.
        Fields: id, title, confidence, type, bbox, timestamp.
        
        Args:
            context: Incident context
            
        Returns:
            List of evidence items
        """
        evidence = []
        
        # Create evidence from top detections (highest confidence first)
        sorted_detections = sorted(
            context.detections, key=lambda d: d.confidence, reverse=True
        )
        for detection in sorted_detections[:10]:
            evidence_item = EvidenceItem(
                id=f"ev_{detection.detection_id[:8]}",
                title=f"{detection.class_name.upper()} Detected",
                timestamp=format_timestamp(detection.timestamp),
                confidence=detection.confidence,
                type=detection.class_name,
                bbox=(
                    detection.bounding_box.x,
                    detection.bounding_box.y,
                    detection.bounding_box.w,
                    detection.bounding_box.h
                )
            )
            evidence.append(evidence_item)
        
        # Create evidence from events
        for event in context.events[:5]:
            evidence_item = EvidenceItem(
                id=f"ev_{event.event_id[:8]}",
                title=f"{event.event_type.replace('_', ' ').title()} Event",
                timestamp=format_timestamp(event.duration),
                confidence=event.confidence_average,
                type=event.event_type,
                bbox=(0.0, 0.0, 0.0, 0.0)
            )
            evidence.append(evidence_item)
        
        self.logger.info(f"[COORDINATOR] Generated {len(evidence)} evidence items")
        return evidence
    
    def _generate_description(self, context: IncidentContext, incident_type: str) -> str:
        """
        Generate incident description.
        
        Args:
            context: Incident context
            incident_type: Type of incident
            
        Returns:
            Description string
        """
        event_types = context.get_event_types()
        people_count = context.get_people_count()
        vehicle_count = context.get_vehicle_count()
        
        description_parts = []
        
        # Add incident type
        description_parts.append(f"{incident_type.replace('_', ' ').title()} detected at {context.location}.")
        
        # Add event details
        if event_types:
            events_str = ", ".join([e.replace("_", " ") for e in event_types])
            description_parts.append(f"Events: {events_str}.")
        
        # Add people count
        if people_count > 0:
            description_parts.append(f"{people_count} people involved.")
        
        # Add vehicle count
        if vehicle_count > 0:
            description_parts.append(f"{vehicle_count} vehicles in vicinity.")
        
        # Add threat assessment
        if context.has_weapon():
            description_parts.append("Weapon present - HIGH THREAT.")
        elif context.has_fight():
            description_parts.append("Physical altercation detected.")
        
        return " ".join(description_parts)
    
    def get_incidents(self) -> List[Incident]:
        """
        Get all generated incidents.
        
        Returns:
            List of incidents
        """
        return self.generated_incidents
    
    def get_latest_incident(self) -> Optional[Incident]:
        """
        Get the most recent incident.
        
        Returns:
            Latest incident or None
        """
        if not self.generated_incidents:
            return None
        
        return self.generated_incidents[-1]
    
    def save_incident_json(self, output_path: Optional[str] = None) -> None:
        """
        Save latest incident to JSON file.
        
        Args:
            output_path: Output file path (default: outputs/incident.json)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "incident.json")
        
        ensure_directory(config.paths.outputs_dir)
        
        latest_incident = self.get_latest_incident()
        if latest_incident:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(latest_incident.model_dump(), f, indent=2, default=str, ensure_ascii=False)
            
            self.logger.info(f"Incident saved to {output_path}")
    
    def reset(self) -> None:
        """Reset coordinator state."""
        self.generated_incidents = []
        self.logger.info("Coordinator reset")
    
    def get_statistics(self) -> Dict[str, any]:
        """
        Get coordinator statistics.
        
        Returns:
            Dictionary with statistics
        """
        if not self.generated_incidents:
            return {
                "total_incidents": 0,
                "by_severity": {},
                "by_status": {}
            }
        
        severity_counts = defaultdict(int)
        status_counts = defaultdict(int)
        
        for incident in self.generated_incidents:
            severity_counts[incident.severity_level.value] += 1
            status_counts[incident.status.value] += 1
        
        return {
            "total_incidents": len(self.generated_incidents),
            "by_severity": dict(severity_counts),
            "by_status": dict(status_counts)
        }
