from __future__ import annotations

import json
import sys
from pathlib import Path

from scenedetect import SceneManager, open_video
from scenedetect.detectors import AdaptiveDetector, ContentDetector


def detect_region(video_path: str) -> dict[str, list[dict[str, float]]]:
    """Detect the single strongest cut in a short video region.

    Runs multiple detectors at high sensitivity and returns only
    the single highest-scoring cut across all strategies.
    """
    candidates: list[dict[str, float]] = []

    # Strategy 1: ContentDetector at very low threshold
    for threshold in (3.0, 6.0, 10.0):
        video = open_video(video_path)
        sm = SceneManager()
        detector = ContentDetector(threshold=threshold, min_scene_len=2)
        sm.add_detector(detector)
        sm.detect_scenes(video=video)

        stats = sm.stats_manager
        if stats is not None:
            for cut_time in sm.get_cut_list(show_warning=False):
                frame_num = cut_time.get_frames()
                [score_value] = stats.get_metrics(frame_num, [ContentDetector.FRAME_SCORE_KEY])
                score = float(score_value or 0.0)
                # Confidence is how far above threshold the score is
                confidence = min(score / max(threshold * 2, 1.0), 1.0)
                candidates.append({
                    "time": round(max(0.0, cut_time.get_seconds()), 3),
                    "confidence": round(confidence, 4),
                    "score": score,
                })

    # Strategy 2: AdaptiveDetector (uses rolling window, better for similar-looking shots)
    try:
        video = open_video(video_path)
        sm = SceneManager()
        detector = AdaptiveDetector(
            adaptive_threshold=1.5,  # Very sensitive
            min_scene_len=2,
            min_content_val=5.0,
        )
        sm.add_detector(detector)
        sm.detect_scenes(video=video)

        for cut_time in sm.get_cut_list(show_warning=False):
            candidates.append({
                "time": round(max(0.0, cut_time.get_seconds()), 3),
                "confidence": 0.75,  # Adaptive gets a solid baseline confidence
                "score": 0.0,
            })
    except Exception:
        pass  # AdaptiveDetector may fail on very short segments

    if not candidates:
        return {"cuts": []}

    # Deduplicate: merge candidates within 2 frames of each other
    candidates.sort(key=lambda c: c["time"])
    merged: list[dict[str, float]] = []
    for c in candidates:
        if merged and abs(c["time"] - merged[-1]["time"]) < 0.1:
            # Keep the higher confidence version
            if c["confidence"] > merged[-1]["confidence"]:
                merged[-1] = c
        else:
            merged.append(c)

    # Return single strongest cut
    strongest = max(merged, key=lambda c: c["confidence"])
    return {"cuts": [{
        "time": strongest["time"],
        "confidence": strongest["confidence"],
    }]}


def main() -> int:
    if len(sys.argv) != 2:
        print(
            json.dumps({"error": "Usage: python detect_region.py <segment_path>"}),
            file=sys.stderr,
        )
        return 1

    video_path = Path(sys.argv[1]).expanduser().resolve()
    if not video_path.exists():
        print(
            json.dumps({"error": f"Video file not found: {video_path}"}),
            file=sys.stderr,
        )
        return 1

    print(json.dumps(detect_region(str(video_path))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
