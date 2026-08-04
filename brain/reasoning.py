"""
Reasoning module for Sentinel AI Emergency Response System.
Explainable AI that generates human-readable explanations.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json

from config import config
from schemas import (
    DetectionResult, TrackResult, Event, Incident,
    SeverityResult, ReasoningResult
)
from utils import setup_logger, format_timestamp, ensure_directory


class ReasoningEngine:
    """
    Explainable AI engine that generates human-readable explanations.
    Never outputs only numbers - provides context and recommendations.
    """
    
    def __init__(self):
        """Initialize reasoning engine."""
        self.logger = setup_logger("reasoning", config)
        
        # Reasoning templates
        self.observation_templates = {
            "weapon": "Weapon detected with {confidence:.0%} confidence",
            "fight": "Physical altercation detected with {confidence:.0%} confidence",
            "crowd": "Crowd of {count} people detected",
            "intrusion": "Unauthorized entry detected in restricted area",
            "fire": "Fire or smoke detected with {confidence:.0%} confidence",
            "blood": "Potential blood detected with {confidence:.0%} confidence",
            "vehicle_anomaly": "Vehicle behaving anomalously",
            "unattended_object": "Unattended object detected for {duration:.1f} seconds"
        }
        
        self.threat_levels = {
            "CRITICAL": "IMMEDIATE ACTION REQUIRED",
            "HIGH": "High threat - Respond quickly",
            "MEDIUM": "Moderate threat - Monitor closely",
            "LOW": "Low threat - Continue monitoring"
        }
        
        self.recommendation_templates = {
            "weapon": "Dispatch armed response unit immediately",
            "fight": "Dispatch patrol unit to break up altercation",
            "crowd": "Monitor crowd for escalation, consider crowd control",
            "intrusion": "Dispatch security to investigate breach",
            "fire": "Dispatch fire department immediately",
            "blood": "Dispatch medical unit for potential injury",
            "vehicle_anomaly": "Traffic unit to investigate vehicle",
            "unattended_object": "Bomb squad assessment if in sensitive area"
        }
        
        self.logger.info("Reasoning engine initialized")
    
    def generate_reasoning(
        self,
        incident: Incident,
        severity: SeverityResult,
        detections: List[DetectionResult],
        tracks: List[TrackResult],
        events: List[Event]
    ) -> ReasoningResult:
        """
        Generate explainable AI reasoning.
        
        Args:
            incident: Incident object
            severity: Severity result
            detections: List of detection results
            tracks: List of track results
            events: List of events
            
        Returns:
            Reasoning result with human-readable explanations
        """
        # Generate key observations
        key_observations = self._generate_observations(detections, events, tracks)
        
        # Generate summary
        summary = self._generate_summary(incident, severity, key_observations)
        
        # Generate detailed explanation
        detailed_explanation = self._generate_detailed_explanation(
            incident, severity, detections, events, tracks
        )
        
        # Generate threat assessment
        threat_assessment = self._generate_threat_assessment(severity, incident)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(incident, severity, events)
        
        # Calculate confidence
        confidence = self._calculate_reasoning_confidence(severity, detections, events)
        
        # Create reasoning result
        result = ReasoningResult(
            incident_id=incident.id,
            summary=summary,
            detailed_explanation=detailed_explanation,
            confidence=confidence,
            key_observations=key_observations,
            threat_assessment=threat_assessment,
            recommendation=recommendation,
            timestamp=datetime.now()
        )
        
        self.logger.info(f"[REASONING] Reasoning generated: confidence={confidence:.2f}, summary='{summary[:80]}...'")
        
        return result
    
    def _generate_observations(
        self,
        detections: List[DetectionResult],
        events: List[Event],
        tracks: List[TrackResult]
    ) -> List[str]:
        """
        Generate key observations from data.
        
        Args:
            detections: List of detection results
            events: List of events
            tracks: List of track results
            
        Returns:
            List of observation strings
        """
        observations = []
        
        # Observations from detections
        detection_counts = {}
        for detection in detections:
            class_name = detection.class_name.lower()
            detection_counts[class_name] = detection_counts.get(class_name, 0) + 1
        
        for class_name, count in detection_counts.items():
            if class_name == "person":
                observations.append(f"{count} people detected in area")
            elif class_name == "weapon":
                max_conf = max([d.confidence for d in detections if d.class_name.lower() == "weapon"])
                observations.append(f"Weapon detected with {max_conf:.0%} confidence")
            elif class_name == "fight":
                max_conf = max([d.confidence for d in detections if d.class_name.lower() == "fight"])
                observations.append(f"Fight behavior detected with {max_conf:.0%} confidence")
            elif class_name in ["backpack", "suitcase", "handbag"]:
                observations.append(f"{count} unattended object(s) detected")
        
        # Observations from events
        for event in events:
            if event.event_type == "weapon_detected":
                observations.append(f"Weapon visible for {event.duration:.1f} seconds")
            elif event.event_type == "fight_detected":
                observations.append(f"Physical altercation lasted {event.duration:.1f} seconds")
            elif event.event_type == "crowd_formation":
                observations.append(f"Crowd formation event detected")
            elif event.event_type == "intrusion":
                observations.append(f"Unauthorized entry detected")
        
        # Observations from tracks
        if tracks:
            avg_speed = sum([t.speed for t in tracks if t.speed]) / len([t for t in tracks if t.speed])
            if avg_speed > 50:
                observations.append(f"High-speed movement detected (avg: {avg_speed:.1f} px/s)")
            
            long_tracks = [t for t in tracks if t.track_duration > 30]
            if long_tracks:
                observations.append(f"{len(long_tracks)} long-duration tracks detected")
        
        return observations[:10]  # Limit to top 10 observations
    
    def _generate_summary(
        self,
        incident: Incident,
        severity: SeverityResult,
        observations: List[str]
    ) -> str:
        """
        Generate concise summary.
        
        Args:
            incident: Incident object
            severity: Severity result
            observations: List of observations
            
        Returns:
            Summary string
        """
        # Start with severity level
        summary_parts = [f"{severity.severity_level.value} severity incident"]
        
        # Add main threat (use snake_case field names from fixed AiMetrics)
        ai = incident.ai_analysis
        if ai and ai.weapon:
            summary_parts.append("involving weapon")
        elif ai and ai.fight:
            summary_parts.append("involving physical altercation")
        elif ai and ai.people > 5:
            summary_parts.append(f"with {ai.people} people")
        
        # Add location
        summary_parts.append(f"at {incident.location}")
        
        # Add severity score
        summary_parts.append(f"(severity: {severity.severity_score:.1f}/10)")
        
        return " ".join(summary_parts)
    
    def _generate_detailed_explanation(
        self,
        incident: Incident,
        severity: SeverityResult,
        detections: List[DetectionResult],
        events: List[Event],
        tracks: List[TrackResult]
    ) -> str:
        """
        Generate detailed explanation.
        
        Args:
            incident: Incident object
            severity: Severity result
            detections: List of detection results
            events: List of events
            tracks: List of track results
            
        Returns:
            Detailed explanation string
        """
        explanation_parts = []
        
        ai = incident.ai_analysis
        
        # Start with primary detection (snake_case fields)
        if ai and ai.weapon:
            weapon_detections = [d for d in detections if "weapon" in d.class_name.lower()]
            if weapon_detections:
                max_conf = max([d.confidence for d in weapon_detections])
                explanation_parts.append(f"Weapon detected with {max_conf:.0%} confidence.")
        
        if ai and ai.fight:
            fight_detections = [d for d in detections if "fight" in d.class_name.lower()]
            if fight_detections:
                max_conf = max([d.confidence for d in fight_detections])
                explanation_parts.append(f"Physical altercation detected with {max_conf:.0%} confidence.")
        
        # Add crowd information
        if ai and ai.people > 0:
            explanation_parts.append(f"{ai.people} people involved in the incident.")
        
        # Add event details
        for event in events:
            if event.event_type == "weapon_detected":
                explanation_parts.append(f"Weapon visible for {event.duration:.1f} seconds across {event.end_frame - event.start_frame} frames.")
            elif event.event_type == "fight_detected":
                explanation_parts.append(f"Altercation lasted {event.duration:.1f} seconds.")
        
        # Add tracking information
        if tracks:
            explanation_parts.append(f"{len(tracks)} unique objects tracked during incident.")
            
            directions = [t.movement_direction for t in tracks if t.movement_direction]
            if directions:
                dominant_direction = max(set(directions), key=directions.count)
                explanation_parts.append(f"Movement predominantly {dominant_direction}.")
        
        # Add severity factors
        if severity.reason_codes:
            factor_descriptions = {
                "weapon_detected": "weapon presence",
                "violence_detected": "violent behavior",
                "high_crowd_density": "high crowd density",
                "restricted_area_breach": "restricted area breach",
                "prolonged_incident": "prolonged duration",
                "night_time_incident": "night time occurrence",
                "suspicious_movement": "suspicious movement patterns",
                "repeated_threat": "repeated threat detection"
            }
            factor_list = [factor_descriptions.get(code, code) for code in severity.reason_codes]
            explanation_parts.append(f"Contributing factors: {', '.join(factor_list)}.")
        
        # Add threat assessment based on severity score
        if severity.severity_score >= 8.0:
            explanation_parts.append("Threat level is CRITICAL and escalating.")
        elif severity.severity_score >= 6.0:
            explanation_parts.append("Threat level is HIGH and requires immediate attention.")
        elif severity.severity_score >= 4.0:
            explanation_parts.append("Threat level is MODERATE and should be monitored.")
        else:
            explanation_parts.append("Threat level is LOW but requires monitoring.")
        
        # Ensure we always have some explanation
        if not explanation_parts:
            classes = list(set(d.class_name for d in detections))
            explanation_parts.append(f"AI detected the following objects: {', '.join(classes) if classes else 'none'}.")
        
        return " ".join(explanation_parts)
    
    def _generate_threat_assessment(
        self,
        severity: SeverityResult,
        incident: Incident
    ) -> str:
        """
        Generate threat assessment.
        
        Args:
            severity: Severity result
            incident: Incident object
            
        Returns:
            Threat assessment string
        """
        threat_level = self.threat_levels.get(severity.severity_level.value, "Unknown threat level")
        
        assessment_parts = [threat_level]
        
        # Add context (snake_case field names)
        ai = incident.ai_analysis
        if ai and ai.weapon:
            assessment_parts.append("due to weapon presence")
        elif ai and ai.fight:
            assessment_parts.append("due to violent behavior")
        elif ai and ai.people > 10:
            assessment_parts.append("due to large crowd")
        
        # Add confidence
        assessment_parts.append(f"(confidence: {severity.confidence:.0%})")
        
        return " - ".join(assessment_parts)
    
    def _generate_recommendation(
        self,
        incident: Incident,
        severity: SeverityResult,
        events: List[Event]
    ) -> str:
        """
        Generate actionable recommendation.
        
        Args:
            incident: Incident object
            severity: Severity result
            events: List of events
            
        Returns:
            Recommendation string
        """
        # Determine primary threat type (snake_case field names)
        primary_threat = None
        ai = incident.ai_analysis
        
        if ai and ai.weapon:
            primary_threat = "weapon"
        elif ai and ai.fight:
            primary_threat = "fight"
        elif any("crowd" in e.event_type.lower() for e in events):
            primary_threat = "crowd"
        elif any("intrusion" in e.event_type.lower() for e in events):
            primary_threat = "intrusion"
        elif any("fire" in e.event_type.lower() for e in events):
            primary_threat = "fire"
        elif ai and ai.blood:
            primary_threat = "blood"
        elif any("unattended_object" in e.event_type.lower() for e in events):
            primary_threat = "unattended_object"
        else:
            # Default based on detections
            primary_threat = "anomaly"
        
        # Get recommendation based on threat
        if primary_threat and primary_threat in self.recommendation_templates:
            recommendation = self.recommendation_templates[primary_threat]
        else:
            recommendation = "Monitor situation and assess need for response"
        
        # Add severity-based qualifier
        if severity.severity_score >= 8.0:
            recommendation = f"{recommendation} - CRITICAL PRIORITY"
        elif severity.severity_score >= 6.0:
            recommendation = f"{recommendation} - HIGH PRIORITY"
        
        # Add specific details
        if ai and ai.people > 0:
            recommendation += f" ({ai.people} people on scene)"
        
        return recommendation
    
    def _calculate_reasoning_confidence(
        self,
        severity: SeverityResult,
        detections: List[DetectionResult],
        events: List[Event]
    ) -> float:
        """
        Calculate confidence in reasoning.
        
        Args:
            severity: Severity result
            detections: List of detection results
            events: List of events
            
        Returns:
            Confidence score (0-1)
        """
        # Base confidence from severity
        confidence = severity.confidence
        
        # Adjust based on data quality
        if len(detections) > 10:
            confidence = min(1.0, confidence + 0.1)
        
        if len(events) > 0:
            confidence = min(1.0, confidence + 0.1)
        
        # Adjust based on detection confidence
        if detections:
            avg_detection_conf = sum([d.confidence for d in detections]) / len(detections)
            if avg_detection_conf > 0.8:
                confidence = min(1.0, confidence + 0.1)
        
        return confidence
    
    def save_reasoning_json(self, reasoning: ReasoningResult, output_path: Optional[str] = None) -> None:
        """
        Save reasoning result to JSON file.
        
        Args:
            reasoning: Reasoning result
            output_path: Output file path (default: outputs/reasoning.json)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "reasoning.json")
        
        ensure_directory(config.paths.outputs_dir)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(reasoning.model_dump(), f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Reasoning saved to {output_path}")
    
    def save_reasoning_html(self, reasoning: ReasoningResult, output_path: Optional[str] = None) -> None:
        """
        Save reasoning result to HTML file.
        
        Args:
            reasoning: Reasoning result
            output_path: Output file path (default: outputs/reasoning.html)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "reasoning.html")
        
        ensure_directory(config.paths.outputs_dir)
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Sentinel AI - Incident Reasoning</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #1e3a5f; color: white; padding: 20px; }}
        .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; }}
        .summary {{ font-size: 18px; font-weight: bold; color: #1e3a5f; }}
        .threat {{ color: #dc2626; font-weight: bold; }}
        .recommendation {{ background: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b; }}
        .observation {{ margin: 5px 0; padding: 5px; background: #f9fafb; }}
        .confidence {{ color: #059669; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Sentinel AI Incident Reasoning</h1>
        <p>Generated: {reasoning.timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <p class="summary">{reasoning.summary}</p>
    </div>
    
    <div class="section">
        <h2>Detailed Explanation</h2>
        <p>{reasoning.detailed_explanation}</p>
    </div>
    
    <div class="section">
        <h2>Threat Assessment</h2>
        <p class="threat">{reasoning.threat_assessment}</p>
    </div>
    
    <div class="section">
        <h2>Key Observations</h2>
        {''.join([f'<div class="observation">- {obs}</div>' for obs in reasoning.key_observations])}
    </div>
    
    <div class="section">
        <h2>Recommendation</h2>
        <div class="recommendation">
            <strong>{reasoning.recommendation}</strong>
        </div>
    </div>
    
    <div class="section">
        <h2>Confidence</h2>
        <p class="confidence">AI Confidence: {reasoning.confidence:.0%}</p>
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        self.logger.info(f"Reasoning HTML saved to {output_path}")
    
    def save_reasoning_markdown(self, reasoning: ReasoningResult, output_path: Optional[str] = None) -> None:
        """
        Save reasoning result to Markdown file.
        
        Args:
            reasoning: Reasoning result
            output_path: Output file path (default: outputs/reasoning.md)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "reasoning.md")
        
        ensure_directory(config.paths.outputs_dir)
        
        md_content = f"""# Sentinel AI Incident Reasoning

**Generated:** {reasoning.timestamp}

## Summary
{reasoning.summary}

## Detailed Explanation
{reasoning.detailed_explanation}

## Threat Assessment
**{reasoning.threat_assessment}**

## Key Observations
"""
        
        for obs in reasoning.key_observations:
            md_content += f"- {obs}\n"
        
        md_content += f"""
## Recommendation
**{reasoning.recommendation}**

## Confidence
AI Confidence: {reasoning.confidence:.0%}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        self.logger.info(f"Reasoning Markdown saved to {output_path}")
