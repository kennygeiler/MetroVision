from __future__ import annotations

import json
import sys
from pathlib import Path

from scenedetect import SceneManager, open_video
from scenedetect.detectors import ContentDetector


def detect_region(video_path: str) -> dict[str, list[dict[str, float]]]:
    video = open_video(video_path)
    detector_threshold = 12.0
    detector = ContentDetector(threshold=detector_threshold, min_scene_len=3)
    scene_manager = SceneManager()
    scene_manager.add_detector(detector)
    scene_manager.detect_scenes(video=video)

    stats_manager = scene_manager.stats_manager
    if stats_manager is None:
        return {"cuts": []}

    strongest_cut: dict[str, float] | None = None
    threshold = max(detector_threshold, 0.0001)

    for cut_time in scene_manager.get_cut_list(show_warning=False):
        frame_num = cut_time.get_frames()
        [score_value] = stats_manager.get_metrics(frame_num, [ContentDetector.FRAME_SCORE_KEY])
        score = float(score_value or 0.0)
        delta = max(score - detector_threshold, 0.0)
        confidence = min(delta / threshold, 1.0)
        candidate = {
            "time": round(max(0.0, cut_time.get_seconds()), 3),
            "confidence": round(confidence, 4),
        }

        if strongest_cut is None or candidate["confidence"] > strongest_cut["confidence"]:
            strongest_cut = candidate

    return {"cuts": [strongest_cut] if strongest_cut else []}


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
