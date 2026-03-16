from __future__ import annotations

import json
import sys
from pathlib import Path

from scenedetect import SceneManager, open_video
from scenedetect.detectors import ContentDetector


def detect_region(video_path: str) -> dict[str, list[dict[str, float]]]:
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=12.0, min_scene_len=3))
    scene_manager.detect_scenes(video=video)

    cuts: list[dict[str, float]] = []
    for index, (start_time, _) in enumerate(
        scene_manager.get_scene_list(start_in_scene=True)
    ):
        if index == 0:
            continue

        cuts.append(
            {
                "time": round(max(0.0, start_time.get_seconds()), 3),
                "confidence": 1.0,
            }
        )

    return {"cuts": cuts}


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
