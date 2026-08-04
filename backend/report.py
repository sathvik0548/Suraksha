"""
Report module for Sentinel AI Emergency Response System.
Generates comprehensive incident reports with all analysis components.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json

from config import config
from schemas import (
    Incident, SeverityResult, ReasoningResult,
    TimelineEvent, IncidentReport, EvidenceItem
)
from utils import setup_logger, ensure_directory


class ReportGenerator:
    """
    Incident report generator that combines all analysis components.
    Prepares architecture for future PDF export.
    """
    
    def __init__(self):
        """Initialize report generator."""
        self.logger = setup_logger("report", config)
        
        self.logger.info("Report generator initialized")
    
    def generate_report(
        self,
        incident: Incident,
        severity: SeverityResult,
        reasoning: ReasoningResult,
        timeline: List[TimelineEvent],
        processing_statistics: Dict[str, any]
    ) -> IncidentReport:
        """
        Generate comprehensive incident report.
        
        Args:
            incident: Incident object
            severity: Severity result
            reasoning: Reasoning result
            timeline: List of timeline events
            processing_statistics: Processing statistics
            
        Returns:
            Complete incident report
        """
        self.logger.info(f"Generating report for incident: {incident.id}")
        
        # Create incident report
        report = IncidentReport(
            incident=incident,
            severity=severity,
            reasoning=reasoning,
            timeline=timeline,
            evidence=incident.evidence_gallery,
            processing_statistics=processing_statistics,
            generated_at=datetime.now()
        )
        
        self.logger.info(f"Report generated: {incident.id}")
        
        return report
    
    def generate_summary(self, report: IncidentReport) -> str:
        """
        Generate executive summary of report.
        
        Args:
            report: Incident report
            
        Returns:
            Summary string
        """
        summary_parts = []
        
        # Incident overview
        summary_parts.append(f"INCIDENT: {report.incident.title}")
        summary_parts.append(f"Location: {report.incident.location}")
        summary_parts.append(f"Severity: {report.incident.severity_level.value} ({report.incident.severity:.1f}/10)")
        summary_parts.append(f"Status: {report.incident.status.value}")
        
        # Key findings
        if report.incident.ai_analysis.weapon:
            summary_parts.append("[WARN] WEAPON DETECTED")
        if report.incident.ai_analysis.fight:
            summary_parts.append("[WARN] VIOLENCE DETECTED")
        if report.incident.ai_analysis.people > 5:
            summary_parts.append(f"[PEOPLE] {report.incident.ai_analysis.people} PEOPLE INVOLVED")
        
        # Recommendation
        summary_parts.append(f"RECOMMENDATION: {report.reasoning.recommendation}")
        
        return "\n".join(summary_parts)
    
    def get_statistics_summary(self, report: IncidentReport) -> Dict[str, any]:
        """
        Get statistics summary from report.
        
        Args:
            report: Incident report
            
        Returns:
            Dictionary with statistics summary
        """
        ai = report.incident.ai_analysis
        return {
            "incident_id": report.incident.id,
            "severity_score": report.incident.severity,
            "severity_level": report.incident.severity_level.value,
            "people_count": ai.people if ai else 0,
            # FIXED: tracking_ids (snake_case) not trackingIDs
            "tracking_ids": ai.tracking_ids if ai else [],
            "evidence_count": len(report.evidence),
            "timeline_events": len(report.timeline),
            "processing_time": report.processing_statistics.get("processing_time", 0),
            "frames_processed": report.processing_statistics.get("processed_frames", 0),
            "average_fps": report.processing_statistics.get("average_fps", 0)
        }
    
    def save_report_json(self, report: IncidentReport, output_path: Optional[str] = None) -> None:
        """
        Save report to JSON file.
        
        Args:
            report: Incident report
            output_path: Output file path (default: outputs/report.json)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "report.json")
        
        ensure_directory(config.paths.outputs_dir)
        
        report_data = {
            "report": report.model_dump(),
            "summary": self.generate_summary(report),
            "statistics": self.get_statistics_summary(report)
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Report saved to {output_path}")
    
    def save_report_html(self, report: IncidentReport, output_path: Optional[str] = None) -> None:
        """
        Save report to HTML file.
        
        Args:
            report: Incident report
            output_path: Output file path (default: outputs/report.html)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "report.html")
        
        ensure_directory(config.paths.outputs_dir)
        
        # Generate HTML content
        html_content = self._generate_html_report(report)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        self.logger.info(f"Report HTML saved to {output_path}")
    
    def _generate_html_report(self, report: IncidentReport) -> str:
        """
        Generate HTML report content.
        
        Args:
            report: Incident report
            
        Returns:
            HTML content string
        """
        severity_color = {
            "CRITICAL": "#dc2626",
            "HIGH": "#f97316",
            "MEDIUM": "#eab308",
            "LOW": "#22c55e"
        }.get(report.incident.severity_level.value, "#6b7280")
        
        evidence_rows = ""
        for evidence in report.evidence:
            evidence_rows += f"""
            <tr>
                <td>{evidence.title}</td>
                <td>{evidence.timestamp}</td>
                <td>{evidence.confidence:.0%}</td>
                <td>{evidence.type}</td>
            </tr>
            """
        
        timeline_rows = ""
        for event in report.timeline:
            event_color = {
                "danger": "#dc2626",
                "warning": "#f97316",
                "dispatch": "#3b82f6",
                "info": "#6b7280",
                "success": "#22c55e"
            }.get(event.type.value, "#6b7280")
            
            timeline_rows += f"""
            <tr>
                <td style="color: {event_color}; font-weight: bold;">{event.time}</td>
                <td>{event.event}</td>
                <td>{event.details}</td>
                <td>{event.actor}</td>
            </tr>
            """
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Sentinel AI - Incident Report {report.incident.id}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .header .meta {{ margin-top: 15px; opacity: 0.9; }}
        .section {{ margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }}
        .section h2 {{ color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-top: 0; }}
        .severity-badge {{ display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background: {severity_color}; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }}
        .stat-box {{ background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #1e3a5f; }}
        .stat-label {{ color: #6b7280; font-size: 12px; text-transform: uppercase; }}
        .stat-value {{ color: #1e3a5f; font-size: 24px; font-weight: bold; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th {{ background: #1e3a5f; color: white; padding: 12px; text-align: left; }}
        td {{ padding: 12px; border-bottom: 1px solid #e5e7eb; }}
        tr:hover {{ background: #f8fafc; }}
        .recommendation {{ background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px; }}
        .recommendation h3 {{ margin: 0 0 10px 0; color: #92400e; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>[REPORT] Incident Report</h1>
            <div class="meta">
                <strong>ID:</strong> {report.incident.id} | 
                <strong>Generated:</strong> {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')} |
                <strong>Camera:</strong> {report.incident.camera}
            </div>
        </div>
        
        <div class="section">
            <h2>Incident Overview</h2>
            <div class="grid">
                <div class="stat-box">
                    <div class="stat-label">Title</div>
                    <div class="stat-value" style="font-size: 18px;">{report.incident.title}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Location</div>
                    <div class="stat-value" style="font-size: 18px;">{report.incident.location}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Severity</div>
                    <div class="stat-value"><span class="severity-badge">{report.incident.severity_level.value} ({report.incident.severity:.1f}/10)</span></div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Status</div>
                    <div class="stat-value" style="font-size: 18px;">{report.incident.status.value}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>AI Analysis</h2>
            <div class="grid">
                <div class="stat-box">
                    <div class="stat-label">People</div>
                    <div class="stat-value">{report.incident.ai_analysis.people}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Weapon</div>
                    <div class="stat-value">{'[OK]' if report.incident.ai_analysis.weapon else '[ERROR]'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Fight</div>
                    <div class="stat-value">{'[OK]' if report.incident.ai_analysis.fight else '[ERROR]'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Blood</div>
                    <div class="stat-value">{'[OK]' if report.incident.ai_analysis.blood else '[ERROR]'}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>Severity Analysis</h2>
            <div class="grid">
                <div class="stat-box">
                    <div class="stat-label">Severity Score</div>
                    <div class="stat-value">{report.severity.severity_score:.1f}/10</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Confidence</div>
                    <div class="stat-value">{report.severity.confidence:.0%}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Trend</div>
                    <div class="stat-value" style="font-size: 18px;">{report.severity.reason_codes[-1] if report.severity.reason_codes else 'N/A'}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>AI Reasoning</h2>
            <p><strong>Summary:</strong> {report.reasoning.summary}</p>
            <p><strong>Detailed Explanation:</strong> {report.reasoning.detailed_explanation}</p>
            <p><strong>Threat Assessment:</strong> <span style="color: {severity_color}; font-weight: bold;">{report.reasoning.threat_assessment}</span></p>
            
            <div class="recommendation">
                <h3>[TARGET] Recommendation</h3>
                <p>{report.reasoning.recommendation}</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Timeline</h2>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Details</th>
                        <th>Actor</th>
                    </tr>
                </thead>
                <tbody>
                    {timeline_rows}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Evidence Gallery</h2>
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Timestamp</th>
                        <th>Confidence</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    {evidence_rows if evidence_rows else '<tr><td colspan="4">No evidence available</td></tr>'}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Processing Statistics</h2>
            <div class="grid">
                <div class="stat-box">
                    <div class="stat-label">Frames Processed</div>
                    <div class="stat-value">{report.processing_statistics.get('processed_frames', 0)}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Processing Time</div>
                    <div class="stat-value">{report.processing_statistics.get('processing_time', 0):.2f}s</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Average FPS</div>
                    <div class="stat-value">{report.processing_statistics.get('average_fps', 0):.1f}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by Sentinel AI Emergency Response System</p>
            <p>Report ID: {report.incident.id} | Timestamp: {report.generated_at.isoformat()}</p>
        </div>
    </div>
</body>
</html>
"""
        return html
    
    def save_report_markdown(self, report: IncidentReport, output_path: Optional[str] = None) -> None:
        """
        Save report to Markdown file.
        
        Args:
            report: Incident report
            output_path: Output file path (default: outputs/report.md)
        """
        if output_path is None:
            output_path = str(config.paths.outputs_dir / "report.md")
        
        ensure_directory(config.paths.outputs_dir)
        
        md_content = f"""# Sentinel AI Incident Report

**Incident ID:** {report.incident.id}  
**Generated:** {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}  
**Camera:** {report.incident.camera}

---

## Incident Overview

**Title:** {report.incident.title}  
**Location:** {report.incident.location}  
**Severity:** {report.incident.severity_level.value} ({report.incident.severity:.1f}/10)  
**Status:** {report.incident.status.value}

---

## AI Analysis

- **People:** {report.incident.ai_analysis.people}
- **Weapon:** {'[OK]' if report.incident.ai_analysis.weapon else '[ERROR]'}
- **Fight:** {'[OK]' if report.incident.ai_analysis.fight else '[ERROR]'}
- **Blood:** {'[OK]' if report.incident.ai_analysis.blood else '[ERROR]'}
- **Tracking IDs:** {', '.join(map(str, report.incident.ai_analysis.tracking_ids))}

---

## Severity Analysis

**Severity Score:** {report.severity.severity_score:.1f}/10  
**Confidence:** {report.severity.confidence:.0%}  
**Reason Codes:** {', '.join(report.severity.reason_codes)}

---

## AI Reasoning

**Summary:** {report.reasoning.summary}

**Detailed Explanation:** {report.reasoning.detailed_explanation}

**Threat Assessment:** {report.reasoning.threat_assessment}

**Recommendation:** {report.reasoning.recommendation}

---

## Timeline

| Time | Event | Details | Actor |
|------|-------|---------|-------|
"""
        
        for event in report.timeline:
            md_content += f"| {event.time} | {event.event} | {event.details} | {event.actor} |\n"
        
        md_content += """
---

## Evidence Gallery

| Title | Timestamp | Confidence | Type |
|-------|-----------|------------|------|
"""
        
        for evidence in report.evidence:
            md_content += f"| {evidence.title} | {evidence.timestamp} | {evidence.confidence:.0%} | {evidence.type} |\n"
        
        md_content += f"""
---

## Processing Statistics

- **Frames Processed:** {report.processing_statistics.get('processed_frames', 0)}
- **Processing Time:** {report.processing_statistics.get('processing_time', 0):.2f}s
- **Average FPS:** {report.processing_statistics.get('average_fps', 0):.1f}

---

*Generated by Sentinel AI Emergency Response System*
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        self.logger.info(f"Report Markdown saved to {output_path}")
    
    def reset(self) -> None:
        """Reset report generator state."""
        self.logger.info("Report generator reset")
