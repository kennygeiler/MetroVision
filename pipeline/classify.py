from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Final, Optional

from google import genai
from google.genai import types

try:
    from .config import GEMINI_MODEL_NAME, GOOGLE_API_KEY, require_env
    from .taxonomy import (
        BLOCKING_TYPES,
        COLOR_TEMPERATURES,
        DEPTH_TYPES,
        DOMINANT_LINES,
        DURATION_CATEGORIES,
        FRAMINGS,
        HORIZONTAL_ANGLES,
        LIGHTING_DIRECTIONS,
        LIGHTING_QUALITIES,
        SHOT_SIZES,
        SYMMETRY_TYPES,
        VERTICAL_ANGLES,
    )
except ImportError:
    from config import GEMINI_MODEL_NAME, GOOGLE_API_KEY, require_env
    from taxonomy import (
        BLOCKING_TYPES,
        COLOR_TEMPERATURES,
        DEPTH_TYPES,
        DOMINANT_LINES,
        DURATION_CATEGORIES,
        FRAMINGS,
        HORIZONTAL_ANGLES,
        LIGHTING_DIRECTIONS,
        LIGHTING_QUALITIES,
        SHOT_SIZES,
        SYMMETRY_TYPES,
        VERTICAL_ANGLES,
    )


def _slug_keys(d: dict[str, Any]) -> tuple[str, ...]:
    return tuple(d.keys())


_FRAMING_VALUES: Final = _slug_keys(FRAMINGS)
_DEPTH_VALUES: Final = _slug_keys(DEPTH_TYPES)
_BLOCKING_VALUES: Final = _slug_keys(BLOCKING_TYPES)
_SYMMETRY_VALUES: Final = _slug_keys(SYMMETRY_TYPES)
_DOMINANT_LINES_VALUES: Final = _slug_keys(DOMINANT_LINES)
_LIGHTING_DIR_VALUES: Final = _slug_keys(LIGHTING_DIRECTIONS)
_LIGHTING_QUAL_VALUES: Final = _slug_keys(LIGHTING_QUALITIES)
_COLOR_TEMP_VALUES: Final = _slug_keys(COLOR_TEMPERATURES)
_SHOT_SIZE_VALUES: Final = _slug_keys(SHOT_SIZES)
_VERTICAL_ANGLE_VALUES: Final = _slug_keys(VERTICAL_ANGLES)
_HORIZONTAL_ANGLE_VALUES: Final = _slug_keys(HORIZONTAL_ANGLES)
_DURATION_VALUES: Final = _slug_keys(DURATION_CATEGORIES)


DEFAULT_CLASSIFICATION: dict[str, Any] = {
    "framing": "centered",
    "depth": "medium",
    "blocking": "single",
    "symmetry": "balanced",
    "dominant_lines": "none",
    "lighting_direction": "natural",
    "lighting_quality": "soft",
    "color_temperature": "neutral",
    "foreground_elements": [],
    "background_elements": [],
    "shot_size": "medium",
    "angle_vertical": "eye_level",
    "angle_horizontal": "frontal",
    "duration_cat": "standard",
    "description": "Classification unavailable — fallback applied",
    "mood": "neutral",
    "lighting": "unknown",
    "subjects": [],
    "scene_title": "Unclassified",
    "scene_description": "",
    "location": "unknown",
    "interior_exterior": "interior",
    "time_of_day": "day",
    "confidence": 0.3,
}


PROMPT_TEMPLATE = """Shot composition analysis (single clip).

Analyze the COMPOSITION of this shot — what is in the frame, how it is arranged, and how it is lit.

Return ONLY valid JSON (no markdown) with these keys:
"framing","depth","blocking","symmetry","dominant_lines","lighting_direction","lighting_quality","color_temperature","foreground_elements","background_elements","shot_size","angle_vertical","angle_horizontal","duration_cat","description","mood","lighting","subjects","scene_title","scene_description","location","interior_exterior","time_of_day"

Valid slug values (use exactly these strings):
framing: {framings}
depth: {depths}
blocking: {blockings}
symmetry: {symmetries}
dominant_lines: {dominant_lines}
lighting_direction: {lighting_dirs}
lighting_quality: {lighting_quals}
color_temperature: {color_temps}
shot_size: {shot_sizes}
angle_vertical: {vertical_angles}
angle_horizontal: {horizontal_angles}
duration_cat: {duration_cats}

foreground_elements and background_elements: arrays of short strings.
subjects: array of strings.
Other text fields: plain strings.

Clip duration (seconds): {clip_duration:.3f}
"""


def _coerce_slug(raw: Any, allowed: tuple[str, ...], fallback: str) -> str:
    if not isinstance(raw, str):
        return fallback
    n = raw.strip().lower().replace(" ", "_")
    if n in allowed:
        return n
    stripped = re.sub(r"[-]", "_", re.sub(r"_shot$", "", n))
    if stripped in allowed:
        return stripped
    return fallback


def _coerce_str_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
    return out


def _probe_duration_seconds(video_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            video_path,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def _extract_json_block(response_text: str) -> dict[str, Any]:
    text = response_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.replace("json", "", 1).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Gemini response did not contain a JSON object.")

    return json.loads(text[start : end + 1])


def _normalize_response(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(DEFAULT_CLASSIFICATION)
    del normalized["confidence"]

    normalized["framing"] = _coerce_slug(payload.get("framing"), _FRAMING_VALUES, "centered")
    normalized["depth"] = _coerce_slug(payload.get("depth"), _DEPTH_VALUES, "medium")
    normalized["blocking"] = _coerce_slug(payload.get("blocking"), _BLOCKING_VALUES, "single")
    normalized["symmetry"] = _coerce_slug(payload.get("symmetry"), _SYMMETRY_VALUES, "balanced")
    normalized["dominant_lines"] = _coerce_slug(
        payload.get("dominant_lines"), _DOMINANT_LINES_VALUES, "none"
    )
    normalized["lighting_direction"] = _coerce_slug(
        payload.get("lighting_direction"), _LIGHTING_DIR_VALUES, "natural"
    )
    normalized["lighting_quality"] = _coerce_slug(
        payload.get("lighting_quality"), _LIGHTING_QUAL_VALUES, "soft"
    )
    normalized["color_temperature"] = _coerce_slug(
        payload.get("color_temperature"), _COLOR_TEMP_VALUES, "neutral"
    )
    normalized["foreground_elements"] = _coerce_str_list(payload.get("foreground_elements"))
    normalized["background_elements"] = _coerce_str_list(payload.get("background_elements"))
    normalized["shot_size"] = _coerce_slug(payload.get("shot_size"), _SHOT_SIZE_VALUES, "medium")
    normalized["angle_vertical"] = _coerce_slug(
        payload.get("angle_vertical"), _VERTICAL_ANGLE_VALUES, "eye_level"
    )
    normalized["angle_horizontal"] = _coerce_slug(
        payload.get("angle_horizontal"), _HORIZONTAL_ANGLE_VALUES, "frontal"
    )
    normalized["duration_cat"] = _coerce_slug(
        payload.get("duration_cat"), _DURATION_VALUES, "standard"
    )

    normalized["description"] = str(payload.get("description") or "").strip() or normalized[
        "description"
    ]
    normalized["mood"] = str(payload.get("mood") or "").strip() or "neutral"
    normalized["lighting"] = str(payload.get("lighting") or "").strip() or "unknown"
    normalized["subjects"] = _coerce_str_list(payload.get("subjects"))
    normalized["scene_title"] = str(payload.get("scene_title") or "").strip() or "Unclassified"
    normalized["scene_description"] = str(payload.get("scene_description") or "").strip()
    normalized["location"] = str(payload.get("location") or "").strip() or "unknown"
    normalized["interior_exterior"] = (
        str(payload.get("interior_exterior") or "").strip() or "interior"
    )
    normalized["time_of_day"] = str(payload.get("time_of_day") or "").strip() or "day"

    taxonomy_keys = (
        "framing",
        "depth",
        "blocking",
        "symmetry",
        "dominant_lines",
        "lighting_direction",
        "lighting_quality",
        "color_temperature",
        "shot_size",
        "angle_vertical",
        "angle_horizontal",
        "duration_cat",
    )
    missing = sum(
        1
        for k in taxonomy_keys
        if k not in payload or payload[k] is None or (isinstance(payload[k], str) and not payload[k].strip())
    )
    normalized["confidence"] = round(max(1.0 - missing * 0.07, 0.28), 3)

    return normalized


def classify_shot(clip_path: str) -> dict[str, Any]:
    api_key = GOOGLE_API_KEY or require_env("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)

    try:
        clip_duration = _probe_duration_seconds(clip_path)
    except Exception:
        clip_duration = 0.0

    prompt = PROMPT_TEMPLATE.format(
        framings=", ".join(_FRAMING_VALUES),
        depths=", ".join(_DEPTH_VALUES),
        blockings=", ".join(_BLOCKING_VALUES),
        symmetries=", ".join(_SYMMETRY_VALUES),
        dominant_lines=", ".join(_DOMINANT_LINES_VALUES),
        lighting_dirs=", ".join(_LIGHTING_DIR_VALUES),
        lighting_quals=", ".join(_LIGHTING_QUAL_VALUES),
        color_temps=", ".join(_COLOR_TEMP_VALUES),
        shot_sizes=", ".join(_SHOT_SIZE_VALUES),
        vertical_angles=", ".join(_VERTICAL_ANGLE_VALUES),
        horizontal_angles=", ".join(_HORIZONTAL_ANGLE_VALUES),
        duration_cats=", ".join(_DURATION_VALUES),
        clip_duration=clip_duration,
    )

    try:
        from .rate_limiter import acquire_token
    except ImportError:
        from rate_limiter import acquire_token

    last_error: Optional[Exception] = None
    for attempt in range(1, 4):
        acquire_token()
        uploaded = None
        try:
            uploaded = client.files.upload(file=clip_path)

            while uploaded.state.name == "PROCESSING":
                time.sleep(2)
                uploaded = client.files.get(name=uploaded.name)

            if uploaded.state.name == "FAILED":
                raise RuntimeError(f"Gemini file processing failed for {clip_path}.")

            response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=[prompt, uploaded],
                config=types.GenerateContentConfig(
                    temperature=0,
                    response_mime_type="application/json",
                ),
            )
            text = response.text or ""
            payload = _extract_json_block(text)
            return _normalize_response(payload)
        except Exception as exc:
            last_error = exc
            if attempt == 3:
                break
            time.sleep(2 ** (attempt - 1))
        finally:
            if uploaded is not None:
                try:
                    client.files.delete(name=uploaded.name)
                except Exception:
                    pass

    print(
        f"Gemini classification failed for {Path(clip_path).name}; "
        "falling back to default taxonomy values."
    )
    if last_error is not None:
        print(f"Last Gemini error: {last_error}")
    out = dict(DEFAULT_CLASSIFICATION)
    out["confidence"] = 0.3
    return out
