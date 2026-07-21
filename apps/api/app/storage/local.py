from pathlib import Path

_ROOT = Path(".storage")


class LocalStorage:
    """Dev fallback — writes under ./.storage."""

    def __init__(self, root: Path = _ROOT) -> None:
        self._root = root
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = self._root / key
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self._path(key).write_bytes(data)
        return key

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def url(self, key: str) -> str:
        return f"file://{self._path(key).resolve()}"

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)
