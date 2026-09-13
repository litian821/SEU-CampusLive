# Operations Handoff

This document explains what can be done from a developer laptop, what belongs on the cloud server, and what teammates should verify before a classroom delivery.

Do not commit real server IP addresses, passwords, tokens, SSH private keys, `.env`, media files, HLS segments, logs, or database runtime files.

## Current Architecture

Campus Live runs as four Docker Compose services:

- `gateway`: public Nginx entrypoint for the Web client, API, HLS, VOD, and photos.
- `web`: Vue 3 + Vite + TypeScript client.
- `api`: FastAPI service for live catalog, VOD catalog, and photo albums.
- `media`: SRS service that receives RTMP and generates HLS.

Default traffic flow:

```text
OBS or FFmpeg -> RTMP -> SRS -> HLS files -> Nginx -> Campus Live Web client
```

## What This Laptop Can Do

Use the laptop for development, Git collaboration, media preparation, and OBS-based live tests.

- Open and edit the project in VS Code through WSL.
- Run the local Docker Compose stack for development.
- Run Web/API/media tests before pushing changes.
- Import local match videos into `storage/vod/` for local testing.
- Import match photos into `storage/photos/` using `scripts/import-photos.py`.
- Push source code changes to GitHub.
- Run OBS and push a prepared basketball video source to the cloud server.
- Verify the public website from a browser after cloud deployment.

Local commands:

```bash
cd /home/sg/work/campus-sports-platform
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Local URLs:

```text
http://127.0.0.1:8080/
http://127.0.0.1:8080/live/demo
http://127.0.0.1:8080/vod
http://127.0.0.1:8080/moments
```

Useful checks:

```bash
make check
make config
make test-api
make test-web
make smoke
make test-media
```

## What The Cloud Server Does

Use the cloud server as the public runtime environment.

Required inbound ports:

- `80/tcp` for the website.
- `443/tcp` for HTTPS after a domain is configured.
- `1935/tcp` for OBS/RTMP publishing.
- `22/tcp` for SSH administration.

Do not expose SRS API port `1985` to the public Internet.

Cloud deployment commands:

```bash
cd /opt/campus-live
git pull
docker compose up --build -d --wait --wait-timeout 180
docker compose ps
curl http://127.0.0.1/api/health
```

Public checks after deployment:

```bash
curl http://<server-ip>/api/health
curl http://<server-ip>/api/live
curl -I http://<server-ip>/
```

## OBS Live Test Without A Webcam

For classroom delivery, prefer a prepared basketball video as the OBS source.

OBS live settings:

```text
Service: Custom
Server: rtmp://<server-ip>:1935/live
Stream Key: demo
```

OBS scene setup:

```text
Sources -> Media Source -> select a basketball match video -> enable loop
```

Recommended output:

```text
Resolution: 1280x720
FPS: 30
Video bitrate: 2500-3500 kbps
Keyframe interval: 2 seconds
Video codec: H.264
Audio codec: AAC
```

Viewer URL:

```text
http://<server-ip>/live/demo
```

## Team Handoff Checklist

Before teammates continue work:

- Confirm the GitHub repository is cloned from the official remote.
- Create a personal branch before making changes.
- Read `AGENTS.md`, `README.md`, and this handoff document.
- Keep media files in `storage/` only.
- Do not commit `.env`, real server addresses, videos, HLS files, logs, or secrets.
- Run relevant tests before opening a pull request.
- Update docs when changing ports, deployment steps, environment variables, streaming behavior, or user-facing workflows.

Before classroom delivery:

- Open cloud security group ports `80/tcp` and `1935/tcp`.
- Verify the website loads from at least one campus network device.
- Verify OBS can publish to the cloud server.
- Verify at least 3-5 devices can watch the same live stream.
- Prepare one fallback VOD video in case the live source fails.
- Replace the default stream key `demo` with a stronger value for the real demo.
- Prepare a short architecture explanation and screenshots of passing tests.

## Common Problems

Website does not open:

- Check `docker compose ps`.
- Check cloud security group port `80/tcp`.
- Check `docker compose logs gateway`.

OBS cannot connect:

- Check cloud security group port `1935/tcp`.
- Confirm OBS server is `rtmp://<server-ip>:1935/live`.
- Confirm stream key matches `LIVE_STREAM_KEY`.
- Check `docker compose logs media`.

Page says waiting for live stream:

- OBS may not be publishing yet.
- HLS generation may need several seconds after publishing starts.
- Confirm `/api/live` reports `status: live`.

VOD cannot seek:

- Confirm the file is H.264 + AAC MP4 when possible.
- Confirm media requests return `206 Partial Content`.
