import json
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
    monkeypatch.delenv('LIVE_MATCHES_JSON', raising=False)


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


def test_multiple_matches_and_camera_angles(monkeypatch):
    monkeypatch.setenv('LIVE_MATCHES_JSON', json.dumps([
        {
            'id': 'faculty-cup',
            'title': '院系杯决赛',
            'sport': '篮球',
            'venue': '九龙湖体育馆',
            'angles': [
                {'stream_id': 'final-main', 'name': '主机位'},
                {'stream_id': 'final-hoop', 'name': '篮下机位'},
            ],
        },
        {
            'id': 'football-friendly',
            'title': '足球友谊赛',
            'sport': '足球',
            'venue': '桃园田径场',
            'angles': [{'stream_id': 'football-main', 'name': '全景机位'}],
        },
    ], ensure_ascii=False))
    monkeypatch.setattr(main, 'fetch_media_streams', lambda: [
        main.MediaStream(name='final-hoop', app='live', publish={'active': True}),
        main.MediaStream(name='walk-on', app='live', publish={'active': True}),
    ])

    response = client.get('/api/matches')
    assert response.headers['cache-control'] == 'no-store'
    matches = {match['id']: match for match in response.json()}
    assert set(matches) == {'faculty-cup', 'football-friendly', 'walk-on'}
    assert matches['faculty-cup']['status'] == 'live'
    assert [(angle['id'], angle['status']) for angle in matches['faculty-cup']['angles']] == [
        ('final-main', 'offline'), ('final-hoop', 'live'),
    ]
    assert matches['football-friendly']['status'] == 'offline'
    assert matches['walk-on']['angles'][0]['playback_url'] == '/media/live/walk-on.m3u8'
    assert client.get('/api/matches/faculty-cup').json()['angles'][1]['name'] == '篮下机位'


def test_legacy_match_endpoint_keeps_demo_compatible():
    match = client.get('/api/matches/demo').json()
    assert match['id'] == 'demo'
    assert match['angles'] == [{
        'id': 'demo', 'name': '主机位', 'status': 'offline',
        'playback_url': '/media/live/demo.m3u8',
    }]


@pytest.mark.parametrize('config', [
    '{bad-json',
    '[]',
    json.dumps([{'id': '../bad', 'title': '比赛', 'sport': '篮球', 'venue': '体育馆', 'angles': [{'stream_id': 'cam1', 'name': '主机位'}]}]),
    json.dumps([
        {'id': 'a', 'title': '比赛 A', 'sport': '篮球', 'venue': '体育馆', 'angles': [{'stream_id': 'same', 'name': '主机位'}]},
        {'id': 'b', 'title': '比赛 B', 'sport': '足球', 'venue': '田径场', 'angles': [{'stream_id': 'same', 'name': '主机位'}]},
    ]),
])
def test_invalid_match_config_returns_503(monkeypatch, config):
    monkeypatch.setenv('LIVE_MATCHES_JSON', config)
    assert client.get('/api/matches').status_code == 503
    assert client.get('/api/live').status_code == 503


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
