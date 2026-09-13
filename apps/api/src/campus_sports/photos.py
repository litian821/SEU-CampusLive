"""Read-only match albums; originals stay in ignored runtime storage."""
import os
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Response
from pydantic import BaseModel

router = APIRouter()
MAX_PHOTO_BYTES = 25 * 1024 * 1024


class Photo(BaseModel):
    id: str
    title: str
    url: str
    size_bytes: int


class PhotoAlbum(BaseModel):
    id: str
    title: str
    photos: list[Photo]


def valid_photo(path: Path) -> bool:
    if path.name.startswith('.') or path.is_symlink() or not path.is_file():
        return False
    if not 0 < path.stat().st_size <= MAX_PHOTO_BYTES:
        return False
    with path.open('rb') as handle:
        header = handle.read(12)
    suffix = path.suffix.lower()
    return ((suffix in {'.jpg', '.jpeg'} and header.startswith(b'\xff\xd8\xff'))
            or (suffix == '.png' and header.startswith(b'\x89PNG\r\n\x1a\n'))
            or (suffix == '.webp' and header[:4] == b'RIFF' and header[8:12] == b'WEBP'))


@router.get('/api/photos', response_model=list[PhotoAlbum])
def list_albums(response: Response) -> list[PhotoAlbum]:
    response.headers['Cache-Control'] = 'no-store'
    root = Path(os.getenv('PHOTO_DIR', '/data/photos'))
    if not root.is_dir():
        return []
    albums = []
    for folder in sorted(root.iterdir(), key=lambda item: item.name.casefold()):
        if folder.name.startswith('.') or folder.is_symlink() or not folder.is_dir():
            continue
        photos = []
        try:
            for path in sorted(folder.iterdir(), key=lambda item: item.name.casefold()):
                try:
                    if not valid_photo(path):
                        continue
                    photos.append(Photo(
                        id=f'{folder.name}/{path.name}', title=path.stem.replace('_', ' '),
                        url=f'/media/photos/{quote(folder.name, safe="")}/{quote(path.name, safe="")}',
                        size_bytes=path.stat().st_size,
                    ))
                except (FileNotFoundError, PermissionError):
                    continue
        except (FileNotFoundError, PermissionError):
            continue
        if photos:
            albums.append(PhotoAlbum(id=folder.name, title=folder.name.replace('_', ' '), photos=photos))
    return albums
