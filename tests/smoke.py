"""Read-only HTTP smoke check. Run after Compose is healthy."""
import json
import os
from urllib.parse import quote
from urllib.request import ProxyHandler, build_opener

base = os.getenv('BASE_URL', 'http://127.0.0.1:8080').rstrip('/')
opener = build_opener(ProxyHandler({}))
for path in ['/', '/live', '/vod', '/api/health', '/api/live', '/api/vod']:
    with opener.open(base + path, timeout=10) as response:
        assert response.status == 200, path
        body = response.read()
        if path == '/api/health':
            assert json.loads(body)['status'] == 'ok'
        elif path == '/api/live':
            streams = json.loads(body)
            assert streams and all(s['status'] in {'live', 'offline'} for s in streams), 'SRS unavailable'
        elif path == '/api/vod':
            for item in json.loads(body):
                with opener.open(base + '/api/vod/detail?filename=' + quote(item['id'], safe=''), timeout=10) as detail:
                    assert json.load(detail)['filename'] == item['filename']
    print('PASS', path)
