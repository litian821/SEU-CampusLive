from pathlib import Path
from urllib.parse import quote

from fastapi.testclient import TestClient
from campus_sports.main import app

client = TestClient(app)
JPEG = b'\xff\xd8\xff' + b'fixture'


def test_album_catalog_filters_unsafe_files(tmp_path: Path, monkeypatch):
    monkeypatch.setenv('PHOTO_DIR', str(tmp_path))
    album = tmp_path / '院系杯 100%'
    album.mkdir()
    filename = '篮下%20对抗.jpg'
    (album / filename).write_bytes(JPEG)
    (album / 'pending.jpg.part').write_bytes(JPEG)
    (album / 'fake.jpg').write_text('<script>bad</script>')
    (album / 'hidden.svg').write_text('<svg/>')
    (album / '.private.jpg').write_bytes(JPEG)
    (album / 'empty.png').touch()
    (album / 'folder.jpg').mkdir()
    (album / 'link.jpg').symlink_to(album / filename)
    (tmp_path / 'alias').symlink_to(album, target_is_directory=True)
    (tmp_path / '.hidden').mkdir()
    (tmp_path / '.hidden' / 'private.jpg').write_bytes(JPEG)
    response = client.get('/api/photos')
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    data = response.json()
    assert len(data) == 1
    assert data[0]['title'] == '院系杯 100%'
    assert len(data[0]['photos']) == 1
    assert data[0]['photos'][0]['url'] == '/media/photos/' + quote(album.name, safe='') + '/' + quote(filename, safe='')


def test_missing_or_empty_albums(tmp_path, monkeypatch):
    monkeypatch.setenv('PHOTO_DIR', str(tmp_path / 'absent'))
    assert client.get('/api/photos').json() == []
    monkeypatch.setenv('PHOTO_DIR', str(tmp_path))
    (tmp_path / 'empty').mkdir()
    assert client.get('/api/photos').json() == []


def test_gallery_rejects_oversize_and_accepts_png_webp(tmp_path, monkeypatch):
    monkeypatch.setenv('PHOTO_DIR', str(tmp_path))
    album = tmp_path / 'final'
    album.mkdir()
    with (album / 'huge.jpg').open('wb') as handle:
        handle.write(JPEG)
        handle.truncate(26 * 1024 * 1024)
    (album / 'a.png').write_bytes(b'\x89PNG\r\n\x1a\n' + b'fixture')
    (album / 'b.webp').write_bytes(b'RIFFxxxxWEBPxxxx')
    assert [photo['title'] for photo in client.get('/api/photos').json()[0]['photos']] == ['a', 'b']
