from __future__ import annotations

from typing import Any

import psycopg2

try:
    from .config import CONFIDENCE_REVIEW_THRESHOLD, DATABASE_URL, require_env
    from .taxonomy import validate_taxonomy_slug
except ImportError:
    from config import CONFIDENCE_REVIEW_THRESHOLD, DATABASE_URL, require_env
    from taxonomy import validate_taxonomy_slug


def _upsert_film(cursor: Any, film_data: dict[str, Any]) -> str:
    cursor.execute(
        """
        SELECT id, year
        FROM films
        WHERE title = %s AND director = %s
        LIMIT 1
        """,
        (film_data["title"], film_data["director"]),
    )
    existing = cursor.fetchone()
    if existing:
        film_id, existing_year = existing
        if existing_year is None and film_data.get("year") is not None:
            cursor.execute(
                "UPDATE films SET year = %s WHERE id = %s",
                (film_data["year"], film_id),
            )
        return film_id

    cursor.execute(
        """
        INSERT INTO films (title, director, year)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (film_data["title"], film_data["director"], film_data.get("year")),
    )
    return cursor.fetchone()[0]


def _technique_notes(shot: dict[str, Any]) -> str | None:
    title = str(shot.get("scene_title") or "").strip()
    desc = str(shot.get("scene_description") or "").strip()
    loc = str(shot.get("location") or "").strip()
    parts = [p for p in (title, desc, loc) if p]
    if not parts:
        return shot.get("technique_notes")
    return " | ".join(parts)[:4000] if parts else None


def write_to_db(film_data: dict[str, Any], shots_data: list[dict[str, Any]]) -> None:
    database_url = DATABASE_URL or require_env("DATABASE_URL")

    with psycopg2.connect(database_url) as connection:
        with connection.cursor() as cursor:
            film_id = _upsert_film(cursor, film_data)

            inserted_shots = 0
            inserted_metadata = 0
            inserted_semantic = 0

            for shot in shots_data:
                for field in (
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
                ):
                    validate_taxonomy_slug(field, shot.get(field))

                cursor.execute(
                    """
                    INSERT INTO shots (
                        film_id,
                        source_file,
                        start_tc,
                        end_tc,
                        duration,
                        video_url,
                        thumbnail_url
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        film_id,
                        shot.get("source_file"),
                        shot.get("start_time"),
                        shot.get("end_time"),
                        shot.get("duration"),
                        shot.get("video_url"),
                        shot.get("thumbnail_url"),
                    ),
                )
                shot_id = cursor.fetchone()[0]
                inserted_shots += 1

                confidence = shot.get("confidence")
                review_status = (
                    "needs_review"
                    if confidence is not None and confidence < CONFIDENCE_REVIEW_THRESHOLD
                    else "unreviewed"
                )

                fg = shot.get("foreground_elements") or []
                bg = shot.get("background_elements") or []
                if not isinstance(fg, list):
                    fg = []
                if not isinstance(bg, list):
                    bg = []

                cursor.execute(
                    """
                    INSERT INTO shot_metadata (
                        shot_id,
                        framing,
                        depth,
                        blocking,
                        symmetry,
                        dominant_lines,
                        lighting_direction,
                        lighting_quality,
                        color_temperature,
                        foreground_elements,
                        background_elements,
                        shot_size,
                        angle_vertical,
                        angle_horizontal,
                        duration_cat,
                        classification_source,
                        confidence,
                        review_status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        shot_id,
                        shot["framing"],
                        shot.get("depth"),
                        shot.get("blocking"),
                        shot.get("symmetry"),
                        shot.get("dominant_lines"),
                        shot.get("lighting_direction"),
                        shot.get("lighting_quality"),
                        shot.get("color_temperature"),
                        fg,
                        bg,
                        shot.get("shot_size"),
                        shot.get("angle_vertical"),
                        shot.get("angle_horizontal"),
                        shot.get("duration_cat"),
                        shot.get("classification_source", "gemini"),
                        confidence,
                        review_status,
                    ),
                )
                inserted_metadata += 1

                cursor.execute(
                    """
                    INSERT INTO shot_semantic (
                        shot_id,
                        description,
                        subjects,
                        mood,
                        lighting,
                        technique_notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        shot_id,
                        shot.get("description"),
                        shot.get("subjects", []),
                        shot.get("mood"),
                        shot.get("lighting"),
                        _technique_notes(shot),
                    ),
                )
                inserted_semantic += 1

    print(
        "Database write complete: "
        f"{inserted_shots} shots, "
        f"{inserted_metadata} metadata rows, "
        f"{inserted_semantic} semantic rows."
    )
