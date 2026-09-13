from pathlib import Path
from urllib.error import URLError

import pytest
from fastapi.testclient import TestClient
from campus_sports import main

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def media_available(monkeypatch):
    monkeypatch.setattr(main, 'fetch_media_streams', lambda: [])
    monkeypatch.setenv('LIVE_STREAM_KEY', 'demo')


def test_health():
    assert client.get('/api/health').json() == {'status': 'ok', 'service': 'api'}


def test_idle_channel_is_not_live():
    response = client.get('/api/live')
    assert response.headers['cache-control'] == 'no-store'
    assert response.json()[0]['status'] == 'offline'
    assert response.json()[0]['playback_url'] == '/media/live/demo.m3u8'


def test_active_streams_are_discovered_and_filtered(monkeypatch):
    streams = [main.MediaStream(name=name, app=app, publish={'active': active}) for name, app, active in [
        ('basketball', 'live', True), ('demo', 'live', True), ('ended', 'live', False),
        ('other', 'private', True), ('../bad', 'live', True),
    ]]
    monkeypatch.setattr(main, 'fetch_media_streams', lambda: streams)
    data = client.get('/api/live').json()
    assert {s['id']: s['status'] for s in data} == {'basketball': 'live', 'demo': 'live'}
    assert client.get('/api/live/basketball').status_code == 200


@pytest.mark.parametrize('failure', [URLError('offline'), TimeoutError(), ValueError('malformed response')])
def test_media_failure_is_unknown_not_offline(monkeypatch, failure):
    def broken():
        raise failure
    monkeypatch.setattr(main, 'fetch_media_streams', broken)
    assert client.get('/api/live').json()[0]['status'] == 'unknown'
    assert client.get('/api/live/unconfirmed').status_code == 503
    assert client.get('/api/health').status_code == 200


def test_missing_channel_and_invalid_config(monkeypatch):
    assert client.get('/api/live/missing').status_code == 404
    monkeypatch.setenv('LIVE_STREAM_KEY', '../unsafe')
    assert client.get('/api/live').status_code == 503


def test_vod_filters_empty_hidden_symlink_and_non_video(tmp_path: Path, monkeypatch):
    (tmp_path / 'final_match.mp4').write_bytes(b'video')
    (tmp_path / 'notes.txt').write_text('ignore')
    (tmp_path / 'empty.mp4').touch()
    (tmp_path / '.upload.mp4').write_bytes(b'partial')
    (tmp_path / 'link.mp4').symlink_to(tmp_path / 'notes.txt')
    (tmp_path / 'folder.mp4').mkdir()
    monkeypatch.setenv('VOD_DIR', str(tmp_path))
    assert [v['filename'] for v in client.get('/api/vod').json()] == ['final_match.mp4']


@pytest.mark.parametrize('filename', ['决赛 100%.mp4', 'literal%20name.mp4', 'match#1?.mp4'])
def test_special_filenames_round_trip(tmp_path, monkeypatch, filename):
    from urllib.parse import quote
    (tmp_path / filename).write_bytes(b'video')
    monkeypatch.setenv('VOD_DIR', str(tmp_path))
    response = client.get('/api/vod/detail', params={'filename': filename})
    assert response.status_code == 200
    assert response.json()['filename'] == filename
    assert response.json()['playback_url'] == '/media/vod/' + quote(filename, safe='')


def test_removed_video_is_404(tmp_path, monkeypatch):
    monkeypatch.setenv('VOD_DIR', str(tmp_path))
    assert client.get('/api/vod/detail', params={'filename': 'gone.mp4'}).status_code == 404
    assert client.get('/api/vod/detail', params={'filename': '../secret.mp4'}).status_code == 404


def test_missing_directory_is_empty(tmp_path, monkeypatch):
    monkeypatch.setenv('VOD_DIR', str(tmp_path / 'missing'))
    assert client.get('/api/vod').json() == []
