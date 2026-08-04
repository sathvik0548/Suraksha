"""
Severity module for Sentinel AI Emergency Response System.
Dynamic severity scoring that evolves during incident analysis.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime
import json

from config import config
from schemas import (
    DetectionResult, TrackResult, Event, SeverityResult, SeverityLevel
)
from utils import setup_logger, ensure_directory


@dataclass
class SeverityFactor:
    """Represents a factor contributing to severity."""
    name: str
    weight: float
    value: float
    contribution: float = 0.0  # Calculated as weight * value
    
    def calculate_contribution(self) -> float:
        """Calculate contribution to severity score."""
        self.contribution = self.weight * self.value
        return self.contribution


class SeverityAnalyzer:
    """
    Dynamic severity analyzer that calculates evolving severity scores.
    Never returns fixed scores - severity evolves during incident.
    """
    
    def __init__(self):
        """Initialize severity analyzer."""
        self.logger = setup_logger("severity", config)
        
        # Current severity state
        self.current_severity = 1.0
        self.severity_history: List[float] = []
        self.factors: Dict[str, SeverityFactor] = {}
        
        # Initialize factors
        self._initialize_factors()
        
        self.logger.info("Severity analyzer initialized")
        self.logger.info(f"Severity range: {config.severity.min_severity} - {config.severity.max_severity}")
    
    def _initialize_factors(self) -> None:
        """Initialize severity factors with weights from config."""
        self.factors = {
            "weapon": SeverityFactor("weapon", config.severity.weapon_weight, 0.0),
            "violence": SeverityFactor("violence", config.severity.violence_weight, 0.0),
            "crowd_density": SeverityFactor("crowd_density", config.severity.crowd_density_weight, 0.0),
            "restricted_area": SeverityFactor("restricted_area", config.severity.restricted_area_weight, 0.0),
            "duration": SeverityFactor("duration", config.severity.duration_weight, 0.0),
            "night_time": SeverityFactor("night_time", config.severity.night_time_weight, 0.0),
            "tracking_behavior": SeverityFactor("tracking_behavior", config.severity.tracking_behavior_weight, 0.0),
            "repeated_detection": SeverityFactor("repeated_detection", 0.5, 0.0)
        }
    
    def analyze_severity(
        self,
        detections: List[DetectionResult],
        tracks: List[TrackResult],
        events: List[Event],
        incident_duration: float,
        is_night_time: bool = False,
        is_restricted_area: bool = False
    ) -> SeverityResult:
        """
        Analyze and calculate dynamic severity.
        
        Args:
            detections: List of detection results
            tracks: List of track results
            events: List of events
            incident_duration: Duration of incident in seconds
            is_night_time: Whether incident occurred at night
            is_restricted_area: Whether incident is in restricted area
            
        Returns:
            Severity result with dynamic score
        """
        # Update factor values based on current data
        self._update_weapon_factor(detections)
        self._update_violence_factor(detections, events)
        self._update_crowd_density_factor(detections)
        self._update_restricted_area_factor(is_restricted_area)
        self._update_duration_factor(incident_duration)
        self._update_night_time_factor(is_night_time)
        self._update_tracking_behavior_factor(tracks)
        self._update_repeated_detection_factor(detections)
        
        # Calculate contributions
        total_contribution = 0.0
        for factor in self.factors.values():
            total_contribution += factor.calculate_contribution()
        
        # Calculate severity score
        base_severity = 1.0
        severity_score = base_severity + total_contribution
        
        # Ensure within bounds
        severity_score = max(
            config.severity.min_severity,
            min(config.severity.max_severity, severity_score)
        )
        
        # Update current severity
        self.current_severity = severity_score
        self.severity_history.append(severity_score)
        
        # Determine severity level
        severity_level = self._get_severity_level(severity_score)
        
        # Generate reason codes
        reason_codes = self._generate_reason_codes()
        
        # Generate risk factors dictionary
        risk_factors = {
            name: factor.value
            for name, factor in self.factors.items()
        }
        
        # Calculate confidence based on factor stability
        confidence = self._calculate_confidence()
        
        # Create severity result
        result = SeverityResult(
            severity_score=severity_score,
            severity_level=severity_level,
            confidence=confidence,
            reason_codes=reason_codes,
            risk_factors=risk_factors,
            timestamp=datetime.now()
        )
        
        self.logger.info(f"Severity calculated: {severity_score:.2f} ({severity_level.value})")
        self.logger.debug(f"Reason codes: {reason_codes}")
        
        return result
    
    def _update_weapon_factor(self, detections: List[DetectionResult]) -> None:
        """Update weapon factor based on detections."""
        weapon_detections = [d for d in detections if "weapon" in d.class_name.lower()]
        
        if weapon_detections:
            # Value based on confidence and frequency
            max_confidence = max([d.confidence for d in weapon_detections])
            frequency = len(weapon_detections) / max(len(detections), 1)
            
            self.factors["weapon"].value = min(1.0, max_confidence * (1 + frequency))
        else:
            self.factors["weapon"].value = 0.0
    
    def _update_violence_factor(self, detections: List[DetectionResult], events: List[Event]) -> None:
        """Update violence factor based on detections and events."""
        violence_detections = [d for d in detections if "fight" in d.class_name.lower()]
        violence_events = [e for e in events if "fight" in e.event_type.lower()]
        
        if violence_detections or violence_events:
            # Value based on detection confidence and event confidence
            max_det_confidence = max([d.confidence for d in violence_detections]) if violence_detections else 0.0
            max_event_confidence = max([e.confidence_average for e in violence_events]) if violence_events else 0.0
            
            self.factors["violence"].value = max(max_det_confidence, max_event_confidence)
        else:
            self.factors["violence"].value = 0.0
    
    def _update_crowd_density_factor(self, detections: List[DetectionResult]) -> None:
        """Update crowd density factor based on person detections."""
        person_detections = [d for d in detections if d.class_name.lower() == "person"]
        people_count = len(person_detections)
        
        # Normalize crowd density (0-1 scale)
        # Assume 20+ people is maximum crowd density
        crowd_density = min(1.0, people_count / 20.0)
        
        self.factors["crowd_density"].value = crowd_density
    
    def _update_restricted_area_factor(self, is_restricted_area: bool) -> None:
        """Update restricted area factor."""
        self.factors["restricted_area"].value = 1.0 if is_restricted_area else 0.0
    
    def _update_duration_factor(self, duration: float) -> None:
        """Update duration factor based on incident duration."""
        # Normalize duration (0-1 scale)
        # Assume 5+ minutes is maximum duration factor
        max_duration = 300.0  # 5 minutes in seconds
        duration_value = min(1.0, duration / max_duration)
        
        self.factors["duration"].value = duration_value
    
    def _update_night_time_factor(self, is_night_time: bool) -> None:
        """Update night time factor."""
        self.factors["night_time"].value = 1.0 if is_night_time else 0.0
    
    def _update_tracking_behavior_factor(self, tracks: List[TrackResult]) -> None:
        """Update tracking behavior factor based on track patterns."""
        if not tracks:
            self.factors["tracking_behavior"].value = 0.0
            return
        
        # Analyze tracking behavior
        suspicious_behaviors = 0
        total_tracks = len(tracks)
        
        for track in tracks:
            # Check for erratic movement (rapid direction changes)
            if track.movement_direction and track.speed:
                if track.speed > 100:  # High speed
                    suspicious_behaviors += 1
            
            # Check for long duration in area
            if track.track_duration > 60:  # More than 1 minute
                suspicious_behaviors += 1
        
        # Calculate behavior score
        behavior_score = min(1.0, suspicious_behaviors / max(total_tracks, 1))
        
        self.factors["tracking_behavior"].value = behavior_score
    
    def _update_repeated_detection_factor(self, detections: List[DetectionResult]) -> None:
        """Update repeated detection factor."""
        if not detections:
            self.factors["repeated_detection"].value = 0.0
            return
        
        # Count detections by class
        class_counts = {}
        for detection in detections:
            class_name = detection.class_name
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        # Check for repeated detections of same class
        max_count = max(class_counts.values()) if class_counts else 0
        total_detections = len(detections)
        
        # High repetition indicates sustained threat
        repetition_ratio = max_count / max(total_detections, 1)
        
        self.factors["repeated_detection"].value = repetition_ratio
    
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
    
    def _generate_reason_codes(self) -> List[str]:
        """
        Generate reason codes based on active factors.
        
        Returns:
            List of reason code strings
        """
        reason_codes = []
        
        for factor_name, factor in self.factors.items():
            if factor.value > 0.3:  # Only include significant factors
                if factor_name == "weapon":
                    reason_codes.append("weapon_detected")
                elif factor_name == "violence":
                    reason_codes.append("violence_detected")
                elif factor_name == "crowd_density":
                    reason_codes.append("high_crowd_density")
                elif factor_name == "restricted_area":
                    reason_codes.append("restricted_area_breach")
                elif factor_name == "duration":
                    reason_codes.append("prolonged_incident")
                elif factor_name == "night_time":
                    reason_codes.append("night_time_incident")
                elif factor_name == "tracking_behavior":
                    reason_codes.append("suspicious_movement")
                elif factor_name == "repeated_detection":
                    reason_codes.append("repeated_threat")
        
        return reason_codes
    
    def _calculate_confidence(self) -> float:
        """
        Calculate confidence in severity assessment.
        
        Returns:
            Confidence score (0-1)
        """
        if not self.severity_history:
            return 0.5
        
        # Check severity stability
        if len(self.severity_history) < 3:
            return 0.6
        
        recent_scores = self.severity_history[-5:]
        variance = max(recent_scores) - min(recent_scores)
        
        # Lower variance = higher confidence
        stability = 1.0 - min(1.0, variance / 3.0)
        
        # Base confidence on stability and data points
        confidence = 0.5 + (stability * 0.4)
        
        return min(1.0, confidence)
    
    def get_current_severity(self) -> float:
        """
        Get current severity score.
        
        Returns:
            Current severity score
        """
        return self.current_severity
    
    def get_severity_history(self) -> List[float]:
        """
        Get severity score history.
        
        Returns:
            List of historical severity scores
        """
        return self.severity_history
    
    def get_factors(self) -> Dict[str, SeverityFactor]:
        """
        Get current factor values.
        
        Returns:
            Dictionary of severity factors
        """
        return self.factors
    
    def save_severity_json(self, output_path: Optional[str] = None) -> None:
        """
        Save severity analysis to JSON file.
        
        Args:
            output_path: Output file path (default: outputs/severity.json)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "severity.json")
        
        ensure_directory(config.paths.outputs_dir)
        
        severity_data = {
            "current_severity": self.current_severity,
            "severity_history": self.severity_history,
            "factors": {
                name: {
                    "value": factor.value,
                    "weight": factor.weight,
                    "contribution": factor.contribution
                }
                for name, factor in self.factors.items()
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(severity_data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Severity data saved to {output_path}")
    
    def reset(self) -> None:
        """Reset severity analyzer state."""
        self.current_severity = 1.0
        self.severity_history = []
        self._initialize_factors()
        
        self.logger.info("Severity analyzer reset")
    
    def get_statistics(self) -> Dict[str, any]:
        """
        Get severity statistics.
        
        Returns:
            Dictionary with statistics
        """
        if not self.severity_history:
            return {
                "current_severity": self.current_severity,
                "average_severity": 0.0,
                "max_severity": 0.0,
                "min_severity": 0.0,
                "trend": "stable"
            }
        
        return {
            "current_severity": self.current_severity,
            "average_severity": sum(self.severity_history) / len(self.severity_history),
            "max_severity": max(self.severity_history),
            "min_severity": min(self.severity_history),
            "trend": self._calculate_trend()
        }
    
    def _calculate_trend(self) -> str:
        """
        Calculate severity trend.
        
        Returns:
            Trend string (increasing, decreasing, stable)
        """
        if len(self.severity_history) < 3:
            return "stable"
        
        recent = self.severity_history[-3:]
        if recent[-1] > recent[0] + 0.5:
            return "increasing"
        elif recent[-1] < recent[0] - 0.5:
            return "decreasing"
        else:
            return "stable"
