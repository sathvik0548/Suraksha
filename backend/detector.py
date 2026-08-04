"""
Video Detector module for Sentinel AI Emergency Response System.
Implements object detection using Ultralytics YOLO11 with professional annotation.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
import time
import json
import uuid

import cv2
import numpy as np
from ultralytics import YOLO

from config import config
from schemas import DetectionResult, BoundingBox
from utils import (
    setup_logger, get_video_info, create_video_writer,
    normalize_bbox, calculate_fps, format_timestamp,
    get_color_by_class, Timer, ensure_directory
)


@dataclass
class ProcessingStatistics:
    """Statistics for video processing."""
    total_frames: int = 0
    processed_frames: int = 0
    skipped_frames: int = 0
    fps: float = 0.0
    processing_time: float = 0.0
    average_fps: float = 0.0
    detection_count: int = 0
    frame_width: int = 0
    frame_height: int = 0
    video_duration: float = 0.0


@dataclass
class DetectionStatistics:
    """Statistics for detection results."""
    total_detections: int = 0
    detections_by_class: Dict[str, int] = field(default_factory=dict)
    average_confidence: float = 0.0
    confidence_by_class: Dict[str, float] = field(default_factory=dict)


class VideoDetector:
    """
    Video detector using YOLO11 for object detection.
    Processes video frames and generates annotated output.
    """
    
    def __init__(self, model_path: Optional[Path] = None):
        """
        Initialize video detector.
        
        Args:
            model_path: Path to YOLO model file (if None, uses default)
        """
        self.logger = setup_logger("detector", config)
        self.model = self._load_model(model_path)
        self.class_names = self.model.names
        self.detection_results: List[DetectionResult] = []
        self.processing_stats = ProcessingStatistics()
        self.detection_stats = DetectionStatistics()
        
        self.logger.info("Video detector initialized")
        self.logger.info(f"Model: {config.model.yolo_model_name}")
        self.logger.info(f"Detection classes: {config.model.detection_classes}")
    
    def _load_model(self, model_path: Optional[Path]) -> YOLO:
        """
        Load YOLO11 model.
        
        Args:
            model_path: Path to model file
            
        Returns:
            Loaded YOLO model
        """
        if model_path is None:
            model_path = config.paths.models_dir / config.model.yolo_model_name
        
        # If model doesn't exist locally, download pretrained model
        if not model_path.exists():
            self.logger.info(f"Model not found at {model_path}, downloading pretrained model...")
            model = YOLO(config.model.yolo_model_name)
            # Save to models directory
            model.save(str(model_path))
            self.logger.info(f"Model saved to {model_path}")
        else:
            self.logger.info(f"Loading model from {model_path}")
            model = YOLO(str(model_path))
        
        return model
    
    def detect_video(
        self,
        video_path: Path,
        camera_id: str,
        output_path: Optional[Path] = None
    ) -> Tuple[List[DetectionResult], ProcessingStatistics, DetectionStatistics]:
        """
        Process video file for object detection.
        
        Args:
            video_path: Path to input video file
            camera_id: Camera identifier
            output_path: Path for annotated video output
            
        Returns:
            Tuple of (detection results, processing statistics, detection statistics)
        """
        self.logger.info(f"Starting video detection: {video_path}")
        self.logger.info(f"Camera ID: {camera_id}")
        
        with Timer("Video detection"):
            # Reset statistics
            self.detection_results = []
            self.processing_stats = ProcessingStatistics()
            self.detection_stats = DetectionStatistics()
            
            # Get video information
            video_info = get_video_info(video_path)
            self.processing_stats.total_frames = video_info['frame_count']
            self.processing_stats.frame_width = video_info['width']
            self.processing_stats.frame_height = video_info['height']
            self.processing_stats.video_duration = video_info['duration']
            self.processing_stats.fps = video_info['fps']
            
            self.logger.info(f"Video info: {video_info}")
            
            # Set output path
            if output_path is None:
                output_path = config.paths.outputs_dir / "annotated.mp4"
            
            ensure_directory(config.paths.outputs_dir)
            
            # Open video
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                raise ValueError(f"Cannot open video file: {video_path}")
            
            # Create video writer
            writer = create_video_writer(
                output_path,
                config.video.annotation_fps,
                (video_info['width'], video_info['height']),
                config.video.codec
            )
            
            # Process frames
            frame_number = 0
            start_time = time.time()
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_timestamp = frame_number / video_info['fps']
                
                # Skip frames if configured
                if config.video.skip_frames > 0 and frame_number % (config.video.skip_frames + 1) != 0:
                    frame_number += 1
                    self.processing_stats.skipped_frames += 1
                    continue
                
                # Detect objects
                frame_detections = self._detect_frame(
                    frame,
                    frame_number,
                    frame_timestamp,
                    camera_id,
                    video_info['width'],
                    video_info['height']
                )
                
                # Add to results
                self.detection_results.extend(frame_detections)
                
                # Annotate frame
                annotated_frame = self._annotate_frame(
                    frame,
                    frame_detections,
                    frame_number,
                    frame_timestamp,
                    camera_id,
                    video_info['fps']
                )
                
                # Write annotated frame
                writer.write(annotated_frame)
                
                frame_number += 1
                self.processing_stats.processed_frames += 1
                
                # Log progress
                if frame_number % 100 == 0:
                    progress = (frame_number / video_info['frame_count']) * 100
                    self.logger.info(f"Progress: {progress:.1f}% ({frame_number}/{video_info['frame_count']} frames)")
            
            # Release resources
            cap.release()
            writer.release()
            
            # Calculate final statistics
            end_time = time.time()
            self.processing_stats.processing_time = end_time - start_time
            self.processing_stats.average_fps = calculate_fps(
                self.processing_stats.processed_frames,
                start_time,
                end_time
            )
            
            # Calculate detection statistics
            self._calculate_detection_statistics()
            
            # Save detection results to JSON
            self._save_detections_json()
            
            self.logger.info(f"Video detection completed: {self.processing_stats.processed_frames} frames")
            self.logger.info(f"Total detections: {self.detection_stats.total_detections}")
            self.logger.info(f"Average FPS: {self.processing_stats.average_fps:.2f}")
            self.logger.info(f"Processing time: {self.processing_stats.processing_time:.2f}s")
            self.logger.info(f"Annotated video saved to: {output_path}")
        
        return self.detection_results, self.processing_stats, self.detection_stats
    
    def _detect_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        timestamp: float,
        camera_id: str,
        frame_width: int,
        frame_height: int
    ) -> List[DetectionResult]:
        """
        Detect objects in a single frame.
        
        Args:
            frame: Input frame
            frame_number: Frame number
            timestamp: Frame timestamp in seconds
            camera_id: Camera identifier
            frame_width: Frame width in pixels
            frame_height: Frame height in pixels
            
        Returns:
            List of detection results
        """
        # Run YOLO detection
        results = self.model(
            frame,
            conf=config.model.yolo_confidence_threshold,
            iou=config.model.yolo_iou_threshold,
            verbose=False
        )
        
        frame_detections = []
        
        # Process results
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())
                class_name = self.class_names[class_id]
                
                # Filter by allowed classes
                if class_name.lower() not in [c.lower() for c in config.model.detection_classes]:
                    continue
                
                # Convert to percentage coordinates
                bbox_width = x2 - x1
                bbox_height = y2 - y1
                normalized_bbox = normalize_bbox(
                    (x1, y1, bbox_width, bbox_height),
                    frame_width,
                    frame_height
                )
                
                # Create detection result
                detection = DetectionResult(
                    frame_number=frame_number,
                    timestamp=timestamp,
                    class_name=class_name,
                    confidence=confidence,
                    bounding_box=BoundingBox(
                        x=normalized_bbox[0],
                        y=normalized_bbox[1],
                        w=normalized_bbox[2],
                        h=normalized_bbox[3]
                    ),
                    camera_id=camera_id,
                    detection_id=str(uuid.uuid4())
                )
                
                frame_detections.append(detection)
                
                # Update detection statistics
                self.detection_stats.total_detections += 1
                self.detection_stats.detections_by_class[class_name] = \
                    self.detection_stats.detections_by_class.get(class_name, 0) + 1
        
        return frame_detections
    
    def _annotate_frame(
        self,
        frame: np.ndarray,
        detections: List[DetectionResult],
        frame_number: int,
        timestamp: float,
        camera_id: str,
        fps: float
    ) -> np.ndarray:
        """
        Annotate frame with detection overlays.
        
        Args:
            frame: Input frame
            detections: List of detection results
            frame_number: Frame number
            timestamp: Frame timestamp
            camera_id: Camera identifier
            fps: Video FPS
            
        Returns:
            Annotated frame
        """
        annotated_frame = frame.copy()
        frame_height, frame_width = frame.shape[:2]
        
        # Draw detection boxes and labels
        for detection in detections:
            # Get color for class
            color = get_color_by_class(
                detection.class_name,
                config.annotation.colors
            )
            
            # Convert normalized bbox to pixel coordinates
            bbox = detection.bounding_box
            x = int((bbox.x / 100) * frame_width)
            y = int((bbox.y / 100) * frame_height)
            w = int((bbox.w / 100) * frame_width)
            h = int((bbox.h / 100) * frame_height)
            
            # Draw bounding box with anti-aliasing
            cv2.rectangle(
                annotated_frame,
                (x, y),
                (x + w, y + h),
                color,
                config.annotation.bbox_thickness,
                config.annotation.bbox_line_type
            )
            
            # Create label
            label = f"{detection.class_name.upper()} {detection.confidence:.1%}"
            
            # Get label size
            (label_width, label_height), baseline = cv2.getTextSize(
                label,
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                config.annotation.font_thickness
            )
            
            # Draw label background
            label_x = x
            label_y = y - config.annotation.label_padding if y > label_height + config.annotation.label_padding else y + label_height + config.annotation.label_padding
            
            cv2.rectangle(
                annotated_frame,
                (label_x, label_y - label_height - baseline - config.annotation.label_padding),
                (label_x + label_width + config.annotation.label_padding * 2, label_y + baseline + config.annotation.label_padding),
                color,
                -1
            )
            
            # Draw label text
            cv2.putText(
                annotated_frame,
                label,
                (label_x + config.annotation.label_padding, label_y - baseline),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (255, 255, 255),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
        
        # Draw UI overlays
        self._draw_ui_overlays(
            annotated_frame,
            frame_number,
            timestamp,
            camera_id,
            fps,
            frame_width,
            frame_height
        )
        
        return annotated_frame
    
    def _draw_ui_overlays(
        self,
        frame: np.ndarray,
        frame_number: int,
        timestamp: float,
        camera_id: str,
        fps: float,
        frame_width: int,
        frame_height: int
    ) -> None:
        """
        Draw professional UI overlays on frame.
        
        Args:
            frame: Input frame
            frame_number: Frame number
            timestamp: Frame timestamp
            camera_id: Camera identifier
            fps: Video FPS
            frame_width: Frame width
            frame_height: Frame height
        """
        # Camera name
        if config.annotation.show_camera_name:
            camera_text = f"CAMERA: {camera_id}"
            text_x = int(config.annotation.camera_name_position[0] * frame_width)
            text_y = int(config.annotation.camera_name_position[1] * frame_height)
            cv2.putText(
                frame,
                camera_text,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (255, 255, 255),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
        
        # Timestamp
        if config.annotation.show_timestamp:
            timestamp_text = f"TIME: {format_timestamp(timestamp)}"
            text_x = int(config.annotation.timestamp_position[0] * frame_width)
            text_y = int(config.annotation.timestamp_position[1] * frame_height)
            cv2.putText(
                frame,
                timestamp_text,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (255, 255, 255),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
        
        # REC indicator
        if config.annotation.show_rec_indicator:
            rec_x = int(0.90 * frame_width)
            rec_y = int(0.05 * frame_height)
            cv2.circle(frame, (rec_x, rec_y), 8, (0, 0, 255), -1)
            cv2.putText(
                frame,
                "REC",
                (rec_x + 12, rec_y + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (0, 0, 255),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
        
        # FPS
        if config.annotation.show_fps:
            fps_text = f"FPS: {fps:.1f}"
            text_x = int(config.annotation.fps_position[0] * frame_width)
            text_y = int(config.annotation.fps_position[1] * frame_height)
            cv2.putText(
                frame,
                fps_text,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (0, 255, 0),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
        
        # Frame counter
        if config.annotation.show_frame_counter:
            frame_text = f"FRAME: {frame_number}"
            text_x = int(config.annotation.frame_counter_position[0] * frame_width)
            text_y = int(config.annotation.frame_counter_position[1] * frame_height)
            cv2.putText(
                frame,
                frame_text,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (255, 255, 255),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
        
        # AI Status
        if config.annotation.show_ai_status:
            ai_status_text = "AI: ACTIVE"
            text_x = int(config.annotation.ai_status_position[0] * frame_width)
            text_y = int(config.annotation.ai_status_position[1] * frame_height)
            cv2.putText(
                frame,
                ai_status_text,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                config.annotation.font_scale,
                (0, 255, 255),
                config.annotation.font_thickness,
                cv2.LINE_AA
            )
    
    def _calculate_detection_statistics(self) -> None:
        """Calculate detection statistics from results."""
        if not self.detection_results:
            return
        
        # Calculate average confidence by class
        confidences_by_class: Dict[str, List[float]] = {}
        
        for detection in self.detection_results:
            class_name = detection.class_name
            confidence = detection.confidence
            
            if class_name not in confidences_by_class:
                confidences_by_class[class_name] = []
            confidences_by_class[class_name].append(confidence)
        
        # Calculate averages
        total_confidence = 0.0
        for class_name, confidences in confidences_by_class.items():
            avg_conf = sum(confidences) / len(confidences)
            self.detection_stats.confidence_by_class[class_name] = avg_conf
            total_confidence += sum(confidences)
        
        if self.detection_results:
            self.detection_stats.average_confidence = total_confidence / len(self.detection_results)
    
    def _save_detections_json(self) -> None:
        """Save detection results to JSON file."""
        detections_file = config.paths.outputs_dir / "detections.json"
        
        detections_data = {
            "detections": [d.model_dump() for d in self.detection_results],
            "processing_statistics": {
                "total_frames": self.processing_stats.total_frames,
                "processed_frames": self.processing_stats.processed_frames,
                "skipped_frames": self.processing_stats.skipped_frames,
                "fps": self.processing_stats.fps,
                "processing_time": self.processing_stats.processing_time,
                "average_fps": self.processing_stats.average_fps
            },
            "detection_statistics": {
                "total_detections": self.detection_stats.total_detections,
                "detections_by_class": self.detection_stats.detections_by_class,
                "average_confidence": self.detection_stats.average_confidence,
                "confidence_by_class": self.detection_stats.confidence_by_class
            }
        }
        
        with open(detections_file, 'w', encoding='utf-8') as f:
            json.dump(detections_data, f, indent=2, default=str, ensure_ascii=False)
        
        self.logger.info(f"Detections saved to {detections_file}")
    
    def get_detections(self) -> List[DetectionResult]:
        """
        Get detection results.
        
        Returns:
            List of detection results
        """
        return self.detection_results
    
    def get_processing_statistics(self) -> ProcessingStatistics:
        """
        Get processing statistics.
        
        Returns:
            Processing statistics
        """
        return self.processing_stats
    
    def get_detection_statistics(self) -> DetectionStatistics:
        """
        Get detection statistics.
        
        Returns:
            Detection statistics
        """
        return self.detection_stats
