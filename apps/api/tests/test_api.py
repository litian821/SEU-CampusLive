from pathlib import Path

from fastapi.testclient import TestClient

from campus_sports.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "api"}


def test_live_catalog_contains_playable_demo() -> None:
    response = client.get("/api/live")
    assert response.status_code == 200
    assert response.json()[0]["playback_url"].endswith(".m3u8")


def test_vod_catalog_filters_media_files(tmp_path: Path, monkeypatch) -> None:
    (tmp_path / "final_match.mp4").write_bytes(b"video")
    (tmp_path / "notes.txt").write_text("ignore me", encoding="utf-8")
    monkeypatch.setenv("VOD_DIR", str(tmp_path))

    response = client.get("/api/vod")

    assert response.status_code == 200
    assert [item["filename"] for item in response.json()] == ["final_match.mp4"]
