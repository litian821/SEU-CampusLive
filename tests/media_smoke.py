"""Real RTMP -> HLS and MP4 Range checks using the existing SRS image's FFmpeg.

Run from repo root. Only uniquely named test resources are stopped/removed.
KEEP_TEST_VIDEO=1 retains the generated clip for manual browser checks.
"""
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener
from uuid import uuid4

base = os.getenv('BASE_URL', 'http://127.0.0.1:8080').rstrip('/')
opener = build_opener(ProxyHandler({}))
root = Path(__file__).resolve().parents[1]
os.chdir(root)
config = json.loads(subprocess.check_output(['docker', 'compose', 'config', '--format', 'json']))
image = config['services']['media']['image']
network = config['networks']['default']['name']
ffmpeg = '/usr/local/srs/objs/ffmpeg/bin/ffmpeg'
token = uuid4().hex[:10]
channel = 'qa-' + token
name = 'campus-media-test-' + token
filename = f'自动验收_100%_{token}.mp4'
target = root / 'storage/vod' / filename
partial = target.with_suffix('.part')

def get(path):
    with opener.open(base + path, timeout=10) as response:
        return response.read()

def wait_for(check, seconds=45):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            result = check()
            if result:
                return result
        except HTTPError as error:
            if error.code != 404:
                raise
        time.sleep(1)
    raise AssertionError('Timed out waiting for media state')

publisher = None
try:
    subprocess.run(['docker', 'run', '--rm', '--user', f'{os.getuid()}:{os.getgid()}',
        '-v', f'{root / "storage/vod"}:/output', '--entrypoint', ffmpeg, image,
        '-hide_banner', '-loglevel', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=25',
        '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '20',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-g', '50',
        '-c:a', 'aac', '-movflags', '+faststart', '-f', 'mp4', '/output/' + partial.name], check=True)
    partial.rename(target)
    url = '/media/vod/' + quote(filename, safe='')
    detail = json.loads(get('/api/vod/detail?filename=' + quote(filename, safe='')))
    assert detail['filename'] == filename
    with opener.open(Request(base + url, headers={'Range': 'bytes=0-1023'}), timeout=10) as response:
        assert response.status == 206
        assert response.headers['Content-Range'] == f'bytes 0-1023/{target.stat().st_size}'
        assert len(response.read()) == 1024
    print('PASS MP4 detail, percent filename and Range 206', flush=True)

    publisher = subprocess.Popen(['docker', 'run', '--rm', '--name', name, '--network', network,
        '-v', f'{root / "storage/vod"}:/input:ro', '--entrypoint', ffmpeg, image,
        '-hide_banner', '-loglevel', 'error', '-re', '-stream_loop', '-1', '-i', '/input/' + filename,
        '-c', 'copy', '-f', 'flv', 'rtmp://media:1935/live/' + channel])
    wait_for(lambda: any(s['id'] == channel and s['status'] == 'live' for s in json.loads(get('/api/live'))))
    manifest = wait_for(lambda: get('/media/live/' + channel + '.m3u8'))
    segment = next(line for line in manifest.decode().splitlines() if line and not line.startswith('#'))
    assert len(get('/media/live/' + segment)) > 188
    subprocess.run(['docker', 'run', '--rm', '--network', network, '--entrypoint', ffmpeg, image,
        '-hide_banner', '-loglevel', 'error', '-i', 'http://gateway/media/live/' + channel + '.m3u8',
        '-t', '2', '-f', 'null', '-'], check=True, timeout=45)
    print('PASS RTMP publish, live discovery, HLS playlist/segment and audio/video decode', flush=True)
finally:
    if publisher is not None:
        subprocess.run(['docker', 'stop', '--time', '2', name], check=False, stdout=subprocess.DEVNULL)
        publisher.wait(timeout=15)
    if partial.exists():
        partial.unlink()
    if target.exists() and os.getenv('KEEP_TEST_VIDEO') != '1':
        target.unlink()

wait_for(lambda: all(s['id'] != channel for s in json.loads(get('/api/live'))))
print('PASS stopped publisher disappears from live catalog')
if target.exists():
    print('Retained synthetic test video:', target)
