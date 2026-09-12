from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI
from pydantic import BaseModel


class LiveStream(BaseModel):
    id: str
    title: str
    sport: str
    venue: str
    status: str
    playback_url: str


class VodItem(BaseModel):
    id: str
    title: str
    filename: str
    size_bytes: int
    playback_url: str


app = FastAPI(
    title=os.getenv("APP_NAME", "Campus Sports Platform"),
    version="0.1.0",
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@app.get("/api/live", response_model=list[LiveStream])
def list_live_streams() -> list[LiveStream]:
    stream_key = os.getenv("LIVE_STREAM_KEY", "demo")
    return [
        LiveStream(
            id=stream_key,
            title="校园赛事直播测试流",
            sport="综合",
            venue="主体育场",
            status="ready",
            playback_url=f"/media/live/{quote(stream_key)}.m3u8",
        )
    ]


@app.get("/api/vod", response_model=list[VodItem])
def list_vod_items() -> list[VodItem]:
    vod_dir = Path(os.getenv("VOD_DIR", "/data/vod"))
    if not vod_dir.is_dir():
        return []

    allowed_suffixes = {".mp4", ".webm", ".mov", ".m4v"}
    items: list[VodItem] = []
    for path in sorted(vod_dir.iterdir(), key=lambda item: item.name.casefold()):
        if not path.is_file() or path.suffix.lower() not in allowed_suffixes:
            continue
        items.append(
            VodItem(
                id=path.name,
                title=path.stem.replace("_", " ").replace("-", " "),
                filename=path.name,
                size_bytes=path.stat().st_size,
                playback_url=f"/media/vod/{quote(path.name)}",
            )
        )
    return items
