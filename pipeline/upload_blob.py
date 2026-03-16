from __future__ import annotations

import mimetypes
from pathlib import Path

import httpx

try:
    from .config import VERCEL_BLOB_READ_WRITE_TOKEN, require_env
except ImportError:
    from config import VERCEL_BLOB_READ_WRITE_TOKEN, require_env


VERCEL_BLOB_API_URL = "https://blob.vercel-storage.com"


def upload_to_blob(file_path: str, filename: str) -> str:
    token = VERCEL_BLOB_READ_WRITE_TOKEN or require_env(
        "VERCEL_BLOB_READ_WRITE_TOKEN"
    )
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    with open(file_path, "rb") as file_handle:
        response = httpx.put(
            f"{VERCEL_BLOB_API_URL}/{filename}",
            headers={
                "authorization": f"Bearer {token}",
                "x-api-version": "7",
                "x-content-type": content_type,
                "x-vercel-blob-access": "private",
            },
            content=file_handle.read(),
            timeout=120.0,
        )

    response.raise_for_status()
    payload = response.json()
    blob_url = payload.get("url")
    if not blob_url:
        raise RuntimeError(
            f"Vercel Blob upload failed for {Path(file_path).name}: missing blob URL."
        )

    return blob_url
