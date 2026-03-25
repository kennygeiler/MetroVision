"""
MetroVision ComfyUI Nodes — V1 Contract

Nodes follow the ComfyUI V1 contract:
- INPUT_TYPES: class method defining inputs
- RETURN_TYPES: tuple of output types
- FUNCTION: name of the execution method
- CATEGORY: node category in ComfyUI menu
- IS_CHANGED: returns float("NaN") for API-querying nodes (AC-12)

Each node queries the MetroVision REST API and returns structured data.
"""

import json
import urllib.request
import urllib.parse
from typing import Any


class MetroVisionSceneQuery:
    """Query the MetroVision film database for shots matching criteria."""

    CATEGORY = "MetroVision"
    FUNCTION = "query"
    RETURN_TYPES = ("STRING", "STRING",)
    RETURN_NAMES = ("shots_json", "summary",)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "api_url": ("STRING", {"default": "http://localhost:3000"}),
                "api_key": ("STRING", {"default": ""}),
            },
            "optional": {
                "movement_type": ("STRING", {"default": ""}),
                "shot_size": ("STRING", {"default": ""}),
                "director": ("STRING", {"default": ""}),
                "film_title": ("STRING", {"default": ""}),
                "search_query": ("STRING", {"default": ""}),
                "limit": ("INT", {"default": 10, "min": 1, "max": 100}),
            },
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # AC-12: Always re-execute for API-querying nodes
        return float("NaN")

    def query(
        self,
        api_url: str,
        api_key: str,
        movement_type: str = "",
        shot_size: str = "",
        director: str = "",
        film_title: str = "",
        search_query: str = "",
        limit: int = 10,
    ) -> tuple[str, str]:
        base = api_url.rstrip("/")

        if search_query.strip():
            # Use search endpoint
            params = {"q": search_query}
            url = f"{base}/api/v1/search?{urllib.parse.urlencode(params)}"
        else:
            # Use shots endpoint with filters
            params: dict[str, Any] = {"limit": str(limit)}
            if movement_type:
                params["movementType"] = movement_type
            if shot_size:
                params["shotSize"] = shot_size
            if director:
                params["director"] = director
            if film_title:
                params["filmTitle"] = film_title
            url = f"{base}/api/v1/shots?{urllib.parse.urlencode(params)}"

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return json.dumps({"error": str(e)}), f"Error: {e}"

        shots = data.get("data", [])
        summary_parts = [f"Found {len(shots)} shots"]
        if shots:
            films = set(s.get("filmTitle", "") for s in shots)
            movements = set(s.get("movementType", "") for s in shots)
            summary_parts.append(f"Films: {', '.join(sorted(films))}")
            summary_parts.append(f"Movements: {', '.join(sorted(movements))}")

        return json.dumps(shots, indent=2), " | ".join(summary_parts)


class MetroVisionFilmAnalysis:
    """Get detailed analysis of a specific film from MetroVision."""

    CATEGORY = "MetroVision"
    FUNCTION = "analyze"
    RETURN_TYPES = ("STRING", "STRING",)
    RETURN_NAMES = ("analysis_json", "summary",)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "api_url": ("STRING", {"default": "http://localhost:3000"}),
                "api_key": ("STRING", {"default": ""}),
                "film_title": ("STRING", {"default": ""}),
            },
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")

    def analyze(
        self,
        api_url: str,
        api_key: str,
        film_title: str,
    ) -> tuple[str, str]:
        base = api_url.rstrip("/")
        params = {"filmTitle": film_title, "limit": "100"}
        url = f"{base}/api/v1/shots?{urllib.parse.urlencode(params)}"

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return json.dumps({"error": str(e)}), f"Error: {e}"

        shots = data.get("data", [])
        if not shots:
            return json.dumps({"error": "Film not found"}), "Film not found"

        # Aggregate stats
        movement_counts: dict[str, int] = {}
        size_counts: dict[str, int] = {}
        total_duration = 0.0

        for s in shots:
            mt = s.get("movementType", "unknown")
            ss = s.get("shotSize", "unknown")
            movement_counts[mt] = movement_counts.get(mt, 0) + 1
            size_counts[ss] = size_counts.get(ss, 0) + 1
            total_duration += s.get("duration", 0)

        analysis = {
            "filmTitle": film_title,
            "shotCount": len(shots),
            "totalDuration": round(total_duration, 2),
            "averageShotLength": round(total_duration / len(shots), 2) if shots else 0,
            "movementDistribution": movement_counts,
            "shotSizeDistribution": size_counts,
        }

        summary = (
            f"{film_title}: {len(shots)} shots, "
            f"avg {analysis['averageShotLength']}s, "
            f"top movement: {max(movement_counts, key=movement_counts.get) if movement_counts else 'n/a'}"
        )

        return json.dumps(analysis, indent=2), summary


class MetroVisionTaxonomy:
    """Get the MetroVision taxonomy (movement types, shot sizes, etc.)."""

    CATEGORY = "MetroVision"
    FUNCTION = "get_taxonomy"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("taxonomy_json",)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "api_url": ("STRING", {"default": "http://localhost:3000"}),
                "api_key": ("STRING", {"default": ""}),
            },
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")

    def get_taxonomy(self, api_url: str, api_key: str) -> tuple[str]:
        base = api_url.rstrip("/")
        url = f"{base}/api/v1/taxonomy"

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return (json.dumps({"error": str(e)}),)

        return (json.dumps(data, indent=2),)


# V1 contract registration
NODE_CLASS_MAPPINGS = {
    "MetroVisionSceneQuery": MetroVisionSceneQuery,
    "MetroVisionFilmAnalysis": MetroVisionFilmAnalysis,
    "MetroVisionTaxonomy": MetroVisionTaxonomy,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MetroVisionSceneQuery": "MetroVision Scene Query",
    "MetroVisionFilmAnalysis": "MetroVision Film Analysis",
    "MetroVisionTaxonomy": "MetroVision Taxonomy",
}
