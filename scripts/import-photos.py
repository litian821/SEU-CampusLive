#!/usr/bin/env python3
"""Import authorized JPEG/PNG/WebP files into a match album without overwriting."""
import argparse
import os
from pathlib import Path
import shutil
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--album', required=True, help='比赛名称，同时作为相册目录名')
parser.add_argument('photos', nargs='+', type=Path)
args = parser.parse_args()
if args.album in {'.', '..'} or args.album.startswith('.') or any(c in args.album for c in '/\\\0') or len(args.album) > 128:
    parser.error('相册名称不能包含路径分隔符，且长度不能超过 128 字符')
root = Path(__file__).resolve().parents[1] / 'storage/photos'
root.mkdir(parents=True, exist_ok=True)
album = root / args.album
if album.is_symlink():
    parser.error('不能导入到符号链接相册')
album.mkdir(exist_ok=True)
for source in args.photos:
    if not source.is_file() or source.name.startswith('.'):
        parser.error(f'无效的照片文件：{source.name}')
    if source.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'} or not 0 < source.stat().st_size <= 25 * 1024 * 1024:
        parser.error(f'只支持 25 MB 以内的 JPEG/PNG/WebP：{source.name}')
    with source.open('rb') as handle:
        header = handle.read(12)
    suffix = source.suffix.lower()
    valid = ((suffix in {'.jpg', '.jpeg'} and header.startswith(b'\xff\xd8\xff'))
             or (suffix == '.png' and header.startswith(b'\x89PNG\r\n\x1a\n'))
             or (suffix == '.webp' and header[:4] == b'RIFF' and header[8:12] == b'WEBP'))
    if not valid:
        parser.error(f'照片类型与文件内容不匹配：{source.name}')
    target = album / source.name
    with tempfile.NamedTemporaryFile(dir=album, prefix='.import-', suffix='.part', delete=False) as handle:
        temporary = Path(handle.name)
        with source.open('rb') as original:
            shutil.copyfileobj(original, handle)
    try:
        os.chmod(temporary, 0o644)
        # Atomic publication with no overwrite, including concurrent importers.
        os.link(temporary, target)
    except FileExistsError:
        parser.error(f'已存在同名照片，未覆盖：{target.name}')
    finally:
        temporary.unlink()
    print(f'已导入：{args.album}/{target.name}')
