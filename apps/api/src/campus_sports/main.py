from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Literal
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, build_opener

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)
STREAM_NAME = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


class LiveStream(BaseModel):
    id: str
    title: str
    sport: str
    venue: str
    status: Literal['live', 'offline', 'unknown']
    playback_url: str


class VodItem(BaseModel):
    id: str
    title: str
    filename: str
    size_bytes: int
    playback_url: str


class Publisher(BaseModel):
    active: bool


class MediaStream(BaseModel):
    name: str
    app: str
    publish: Publisher


class MediaStreams(BaseModel):
    code: int
    streams: list[MediaStream]


app = FastAPI(title=os.getenv('APP_NAME', 'Campus Sports Platform'), version='0.2.0')


def fetch_media_streams() -> list[MediaStream]:
    # Internal Compose traffic must never inherit a host HTTP proxy.
    url = os.getenv('SRS_API_URL', 'http://media:1985').rstrip('/')
    with build_opener(ProxyHandler({})).open(f'{url}/api/v1/streams/?count=1000', timeout=2) as response:
        payload = MediaStreams.model_validate(json.load(response))
    if payload.code != 0:
        raise ValueError('SRS returned a nonzero status')
    return payload.streams


@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'api'}


@app.get('/api/live', response_model=list[LiveStream])
def list_live_streams(response: Response) -> list[LiveStream]:
    response.headers['Cache-Control'] = 'no-store'
    stream_key = os.getenv('LIVE_STREAM_KEY', 'demo')
    if not STREAM_NAME.fullmatch(stream_key):
        raise HTTPException(503, '直播频道配置无效，请联系管理员')
    available = True
    try:
        active = {stream.name for stream in fetch_media_streams()
                  if stream.app == 'live' and stream.publish.active
                  and STREAM_NAME.fullmatch(stream.name)}
    except (URLError, OSError, ValueError, ValidationError):
        logger.warning('SRS stream status is unavailable')
        available, active = False, set()

    return [LiveStream(
        id=name,
        title=os.getenv('LIVE_TITLE', '校园赛事直播') if name == stream_key else f'校园赛事 · {name}',
        sport=os.getenv('LIVE_SPORT', '综合'),
        venue=os.getenv('LIVE_VENUE', '主体育场'),
        status=('live' if name in active else 'offline') if available else 'unknown',
        playback_url=f'/media/live/{quote(name, safe="")}.m3u8',
    ) for name in sorted(active | {stream_key}, key=lambda name: (name not in active, name))]


@app.get('/api/live/{stream_id}', response_model=LiveStream)
def get_live_stream(stream_id: str, response: Response) -> LiveStream:
    streams = list_live_streams(response)
    for stream in streams:
        if stream.id == stream_id:
            return stream
    if any(stream.status == 'unknown' for stream in streams):
        raise HTTPException(503, '暂时无法确认直播状态，请稍后重试')
    raise HTTPException(404, '频道不存在或已结束直播')


@app.get('/api/vod', response_model=list[VodItem])
def list_vod_items() -> list[VodItem]:
    vod_dir = Path(os.getenv('VOD_DIR', '/data/vod'))
    if not vod_dir.is_dir():
        return []
    items = []
    for path in sorted(vod_dir.iterdir(), key=lambda item: item.name.casefold()):
        if path.name.startswith('.') or path.is_symlink() or path.suffix.lower() not in {'.mp4', '.webm', '.mov', '.m4v'}:
            continue
        try:
            if not path.is_file():
                continue
            size = path.stat().st_size
        except FileNotFoundError:
            continue  # A file can be removed between directory scan and stat.
        if size == 0:
            continue
        items.append(VodItem(
            id=path.name, title=path.stem.replace('_', ' ').replace('-', ' '),
            filename=path.name, size_bytes=size,
            playback_url=f'/media/vod/{quote(path.name, safe="")}',
        ))
    return items


@app.get('/api/vod/detail', response_model=VodItem)
def get_vod_item(filename: str) -> VodItem:
    for item in list_vod_items():
        if item.id == filename:
            return item
    raise HTTPException(404, '视频不存在或已下架')
