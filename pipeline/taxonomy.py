from typing import Final, TypedDict


class TaxonomyEntry(TypedDict):
    slug: str
    displayName: str


MOVEMENT_TYPES: Final[dict[str, TaxonomyEntry]] = {
    "static": {"slug": "static", "displayName": "Static"},
    "pan": {"slug": "pan", "displayName": "Pan"},
    "tilt": {"slug": "tilt", "displayName": "Tilt"},
    "dolly": {"slug": "dolly", "displayName": "Dolly"},
    "truck": {"slug": "truck", "displayName": "Truck"},
    "pedestal": {"slug": "pedestal", "displayName": "Pedestal"},
    "crane": {"slug": "crane", "displayName": "Crane"},
    "boom": {"slug": "boom", "displayName": "Boom"},
    "zoom": {"slug": "zoom", "displayName": "Zoom"},
    "dolly_zoom": {"slug": "dolly_zoom", "displayName": "Dolly Zoom"},
    "handheld": {"slug": "handheld", "displayName": "Handheld"},
    "steadicam": {"slug": "steadicam", "displayName": "Steadicam"},
    "drone": {"slug": "drone", "displayName": "Drone"},
    "aerial": {"slug": "aerial", "displayName": "Aerial"},
    "arc": {"slug": "arc", "displayName": "Arc"},
    "whip_pan": {"slug": "whip_pan", "displayName": "Whip Pan"},
    "whip_tilt": {"slug": "whip_tilt", "displayName": "Whip Tilt"},
    "rack_focus": {"slug": "rack_focus", "displayName": "Rack Focus"},
    "follow": {"slug": "follow", "displayName": "Follow"},
    "reveal": {"slug": "reveal", "displayName": "Reveal"},
    "reframe": {"slug": "reframe", "displayName": "Reframe"},
}

DIRECTIONS: Final[dict[str, TaxonomyEntry]] = {
    "left": {"slug": "left", "displayName": "Left"},
    "right": {"slug": "right", "displayName": "Right"},
    "up": {"slug": "up", "displayName": "Up"},
    "down": {"slug": "down", "displayName": "Down"},
    "in": {"slug": "in", "displayName": "In"},
    "out": {"slug": "out", "displayName": "Out"},
    "clockwise": {"slug": "clockwise", "displayName": "Clockwise"},
    "counter_clockwise": {
        "slug": "counter_clockwise",
        "displayName": "Counter Clockwise",
    },
    "forward": {"slug": "forward", "displayName": "Forward"},
    "backward": {"slug": "backward", "displayName": "Backward"},
    "lateral_left": {"slug": "lateral_left", "displayName": "Lateral Left"},
    "lateral_right": {"slug": "lateral_right", "displayName": "Lateral Right"},
    "diagonal": {"slug": "diagonal", "displayName": "Diagonal"},
    "circular": {"slug": "circular", "displayName": "Circular"},
    "none": {"slug": "none", "displayName": "None"},
}

SPEEDS: Final[dict[str, TaxonomyEntry]] = {
    "freeze": {"slug": "freeze", "displayName": "Freeze"},
    "imperceptible": {"slug": "imperceptible", "displayName": "Imperceptible"},
    "slow": {"slug": "slow", "displayName": "Slow"},
    "moderate": {"slug": "moderate", "displayName": "Moderate"},
    "fast": {"slug": "fast", "displayName": "Fast"},
    "very_fast": {"slug": "very_fast", "displayName": "Very Fast"},
    "snap": {"slug": "snap", "displayName": "Snap"},
}

SHOT_SIZES: Final[dict[str, TaxonomyEntry]] = {
    "extreme_wide": {"slug": "extreme_wide", "displayName": "Extreme Wide"},
    "wide": {"slug": "wide", "displayName": "Wide"},
    "full": {"slug": "full", "displayName": "Full"},
    "medium_wide": {"slug": "medium_wide", "displayName": "Medium Wide"},
    "medium": {"slug": "medium", "displayName": "Medium"},
    "medium_close": {"slug": "medium_close", "displayName": "Medium Close"},
    "close": {"slug": "close", "displayName": "Close"},
    "extreme_close": {"slug": "extreme_close", "displayName": "Extreme Close"},
    "insert": {"slug": "insert", "displayName": "Insert"},
    "two_shot": {"slug": "two_shot", "displayName": "Two Shot"},
    "three_shot": {"slug": "three_shot", "displayName": "Three Shot"},
    "group": {"slug": "group", "displayName": "Group"},
    "ots": {"slug": "ots", "displayName": "OTS"},
    "pov": {"slug": "pov", "displayName": "POV"},
    "reaction": {"slug": "reaction", "displayName": "Reaction"},
}

VERTICAL_ANGLES: Final[dict[str, TaxonomyEntry]] = {
    "eye_level": {"slug": "eye_level", "displayName": "Eye Level"},
    "high_angle": {"slug": "high_angle", "displayName": "High Angle"},
    "low_angle": {"slug": "low_angle", "displayName": "Low Angle"},
    "birds_eye": {"slug": "birds_eye", "displayName": "Bird's Eye"},
    "worms_eye": {"slug": "worms_eye", "displayName": "Worm's Eye"},
    "overhead": {"slug": "overhead", "displayName": "Overhead"},
}

HORIZONTAL_ANGLES: Final[dict[str, TaxonomyEntry]] = {
    "frontal": {"slug": "frontal", "displayName": "Frontal"},
    "profile": {"slug": "profile", "displayName": "Profile"},
    "three_quarter": {"slug": "three_quarter", "displayName": "Three Quarter"},
    "rear": {"slug": "rear", "displayName": "Rear"},
    "ots": {"slug": "ots", "displayName": "OTS"},
}

SPECIAL_ANGLES: Final[dict[str, TaxonomyEntry]] = {
    "dutch": {"slug": "dutch", "displayName": "Dutch"},
    "pov": {"slug": "pov", "displayName": "POV"},
    "shoulder_mounted": {
        "slug": "shoulder_mounted",
        "displayName": "Shoulder Mounted",
    },
    "slanted": {"slug": "slanted", "displayName": "Slanted"},
}

DURATION_CATEGORIES: Final[dict[str, TaxonomyEntry]] = {
    "flash": {"slug": "flash", "displayName": "Flash"},
    "brief": {"slug": "brief", "displayName": "Brief"},
    "standard": {"slug": "standard", "displayName": "Standard"},
    "extended": {"slug": "extended", "displayName": "Extended"},
    "long_take": {"slug": "long_take", "displayName": "Long Take"},
    "oner": {"slug": "oner", "displayName": "Oner"},
}

CAMERA_ANGLES: Final[dict[str, dict[str, TaxonomyEntry]]] = {
    "vertical": VERTICAL_ANGLES,
    "horizontal": HORIZONTAL_ANGLES,
    "special": SPECIAL_ANGLES,
}
