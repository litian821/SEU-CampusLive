"""Native Linux/WSL only: configure an ignored Compose build proxy from shell env."""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
target = root / 'compose.override.yaml'
proxy = os.getenv('HTTPS_PROXY') or os.getenv('https_proxy') or os.getenv('HTTP_PROXY') or os.getenv('http_proxy')
if not proxy or urlsplit(proxy).scheme not in {'http', 'https'} or not urlsplit(proxy).hostname:
    raise SystemExit('Set HTTPS_PROXY to a valid HTTP(S) proxy URL first.')
if target.exists():
    raise SystemExit('compose.override.yaml already exists; inspect and merge manually. No file changed.')
services = {name: {'build': {'network': 'host', 'args': {'HTTP_PROXY': proxy, 'HTTPS_PROXY': proxy}}}
            for name in ['api', 'api-test', 'web', 'web-build']}
# JSON is valid YAML; values are serialized, never interpolated into shell commands.
with target.open('x', encoding='utf-8') as file:
    target.chmod(0o600)
    json.dump({'services': services}, file, indent=2)
    file.write('\n')
print('Created ignored compose.override.yaml. Proxy values are not printed.')
