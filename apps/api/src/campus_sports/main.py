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
from pydantic import BaseModel, TypeAdapter, ValidationError
from .photos import router as photos_router

logger = logging.getLogger(__name__)
STREAM_NAME = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


class LiveStream(BaseModel):
    id: str
    title: str
    sport: str
    venue: str
    status: Literal['live', 'offline', 'unknown']
    playback_url: str


class LiveAngle(BaseModel):
    id: str
    name: str
    status: Literal['live', 'offline', 'unknown']
    playback_url: str


class LiveMatch(BaseModel):
    id: str
    title: str
    sport: str
    venue: str
    status: Literal['live', 'offline', 'unknown']
    angles: list[LiveAngle]


class LiveAngleConfig(BaseModel):
    stream_id: str
    name: str


class LiveMatchConfig(BaseModel):
    id: str
    title: str
    sport: str
    venue: str
    angles: list[LiveAngleConfig]


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


app = FastAPI(title=os.getenv('APP_NAME', 'Campus Sports Platform'), version='0.3.0')
app.include_router(photos_router)


def fetch_media_streams() -> list[MediaStream]:
    # Internal Compose traffic must never inherit a host HTTP proxy.
    url = os.getenv('SRS_API_URL', 'http://media:1985').rstrip('/')
    with build_opener(ProxyHandler({})).open(f'{url}/api/v1/streams/?count=1000', timeout=2) as response:
        payload = MediaStreams.model_validate(json.load(response))
    if payload.code != 0:
        raise ValueError('SRS returned a nonzero status')
    return payload.streams


def load_match_configs() -> list[LiveMatchConfig]:
    raw = os.getenv('LIVE_MATCHES_JSON', '').strip()
    if raw:
        try:
            matches = TypeAdapter(list[LiveMatchConfig]).validate_json(raw)
        except ValidationError as error:
            raise ValueError('LIVE_MATCHES_JSON is not valid') from error
    else:
        matches = [LiveMatchConfig(
            id=os.getenv('LIVE_STREAM_KEY', 'demo'),
            title=os.getenv('LIVE_TITLE', '院系杯 · 网络空间安全学院 vs 电子科学与工程学院'),
            sport=os.getenv('LIVE_SPORT', '篮球'),
            venue=os.getenv('LIVE_VENUE', '东南大学'),
            angles=[LiveAngleConfig(stream_id=os.getenv('LIVE_STREAM_KEY', 'demo'), name='主机位')],
        )]

    if not matches:
        raise ValueError('at least one live match is required')

    match_ids: set[str] = set()
    stream_ids: set[str] = set()
    for match in matches:
        if not STREAM_NAME.fullmatch(match.id) or not match.title.strip() or not match.sport.strip() or not match.venue.strip() or not match.angles:
            raise ValueError('live match contains an invalid or missing field')
        if match.id in match_ids:
            raise ValueError('live match ids must be unique')
        match_ids.add(match.id)
        for angle in match.angles:
            if not STREAM_NAME.fullmatch(angle.stream_id) or not angle.name.strip():
                raise ValueError('live angle contains an invalid or missing field')
            if angle.stream_id in stream_ids:
                raise ValueError('live stream ids must be unique across matches')
            stream_ids.add(angle.stream_id)
    return matches


def active_stream_names() -> tuple[bool, set[str]]:
    try:
        active = {stream.name for stream in fetch_media_streams()
                  if stream.app == 'live' and stream.publish.active
                  and STREAM_NAME.fullmatch(stream.name)}
    except (URLError, OSError, ValueError, ValidationError):
        logger.warning('SRS stream status is unavailable')
        return False, set()
    return True, active


def live_state(name: str, available: bool, active: set[str]) -> Literal['live', 'offline', 'unknown']:
    if not available:
        return 'unknown'
    return 'live' if name in active else 'offline'


def playback_url(name: str) -> str:
    return f'/media/live/{quote(name, safe="")}.m3u8'


def build_live_matches(configs: list[LiveMatchConfig], available: bool, active: set[str]) -> list[LiveMatch]:
    matches: list[LiveMatch] = []
    configured_match_ids = {config.id for config in configs}
    configured_streams: set[str] = set()
    for config in configs:
        angles = [LiveAngle(
            id=angle.stream_id,
            name=angle.name,
            status=live_state(angle.stream_id, available, active),
            playback_url=playback_url(angle.stream_id),
        ) for angle in config.angles]
        configured_streams.update(angle.id for angle in angles)
        status: Literal['live', 'offline', 'unknown'] = 'unknown' if not available else (
            'live' if any(angle.status == 'live' for angle in angles) else 'offline'
        )
        matches.append(LiveMatch(
            id=config.id, title=config.title, sport=config.sport, venue=config.venue,
            status=status, angles=angles,
        ))

    # Keep ad-hoc streams visible during testing even before they are added to config.
    for name in sorted(active - configured_streams - configured_match_ids):
        matches.append(LiveMatch(
            id=name, title=f'校园赛事 · {name}', sport='校园赛事', venue='东南大学', status='live',
            angles=[LiveAngle(id=name, name='主机位', status='live', playback_url=playback_url(name))],
        ))
    return sorted(matches, key=lambda match: (match.status != 'live', match.title, match.id))


@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'api'}


@app.get('/api/live', response_model=list[LiveStream])
def list_live_streams(response: Response) -> list[LiveStream]:
    response.headers['Cache-Control'] = 'no-store'
    try:
        configs = load_match_configs()
    except ValueError:
        raise HTTPException(503, '直播频道配置无效，请联系管理员')
    available, active = active_stream_names()
    metadata = {
        angle.stream_id: (match, angle)
        for match in configs for angle in match.angles
    }
    streams = []
    for name in active | metadata.keys():
        configured = metadata.get(name)
        if configured:
            match, angle = configured
            title = match.title if len(match.angles) == 1 else f'{match.title} · {angle.name}'
            sport, venue = match.sport, match.venue
        else:
            title, sport, venue = f'校园赛事 · {name}', '校园赛事', '东南大学'
        streams.append(LiveStream(
            id=name, title=title, sport=sport, venue=venue,
            status=live_state(name, available, active), playback_url=playback_url(name),
        ))
    return sorted(streams, key=lambda stream: (stream.status != 'live', stream.title, stream.id))


@app.get('/api/live/{stream_id}', response_model=LiveStream)
def get_live_stream(stream_id: str, response: Response) -> LiveStream:
    streams = list_live_streams(response)
    for stream in streams:
        if stream.id == stream_id:
            return stream
    if any(stream.status == 'unknown' for stream in streams):
        raise HTTPException(503, '暂时无法确认直播状态，请稍后重试')
    raise HTTPException(404, '频道不存在或已结束直播')


@app.get('/api/matches', response_model=list[LiveMatch])
def list_live_matches(response: Response) -> list[LiveMatch]:
    response.headers['Cache-Control'] = 'no-store'
    try:
        configs = load_match_configs()
    except ValueError:
        raise HTTPException(503, '直播比赛配置无效，请联系管理员')
    available, active = active_stream_names()
    return build_live_matches(configs, available, active)


@app.get('/api/matches/{match_id}', response_model=LiveMatch)
def get_live_match(match_id: str, response: Response) -> LiveMatch:
    matches = list_live_matches(response)
    for match in matches:
        if match.id == match_id:
            return match
    if any(match.status == 'unknown' for match in matches):
        raise HTTPException(503, '暂时无法确认直播状态，请稍后重试')
    raise HTTPException(404, '比赛不存在或已结束直播')


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
