import base64
import binascii
import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..historico import to_local
from ..models import GalleryImage, Key, User
from ..schemas import GalleryCategory, GalleryImageCreate, GalleryImageOut

router = APIRouter(
    prefix="/gallery",
    tags=["gallery"],
    dependencies=[Depends(get_current_user)],
)

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
HTTP_422 = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
HTTP_413 = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
MIME_TO_EXTENSION = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
DATA_URL_RE = re.compile(
    r"^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$",
    re.IGNORECASE,
)


def _matches_magic_bytes(mime_type: str, data: bytes) -> bool:
    if mime_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if mime_type == "image/webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False


def _decode_image_data(image_data: str) -> tuple[str, bytes]:
    match = DATA_URL_RE.match(image_data.strip())
    if not match:
        raise HTTPException(
            status_code=HTTP_422,
            detail="Formato de imagem inválido. Envie PNG, JPEG ou WebP.",
        )

    mime_type = match.group(1).lower()
    encoded = re.sub(r"\s+", "", match.group(2))
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(
            status_code=HTTP_422,
            detail="Não foi possível decodificar o arquivo da imagem.",
        )

    if not raw:
        raise HTTPException(
            status_code=HTTP_422,
            detail="O arquivo de imagem está vazio.",
        )
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=HTTP_413,
            detail="A imagem ultrapassa o limite máximo de 10 MB.",
        )
    if not _matches_magic_bytes(mime_type, raw):
        raise HTTPException(
            status_code=HTTP_422,
            detail="O conteúdo do arquivo não corresponde a uma imagem válida.",
        )

    return mime_type, raw


def _gallery_dir() -> Path:
    directory = settings.gallery_upload_path
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _safe_file_path(file_name: str) -> Path:
    base_dir = _gallery_dir().resolve()
    target = (base_dir / file_name).resolve()
    if target.parent != base_dir:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo da imagem não encontrado.",
        )
    return target


def _serialize_image(
    image: GalleryImage,
    key_code: str | None = None,
    key_description: str | None = None,
) -> GalleryImageOut:
    return GalleryImageOut(
        id=image.id,
        name=image.name,
        description=image.description,
        category=image.category,
        key_id=image.key_id,
        key_code=key_code,
        key_description=key_description,
        mime_type=image.mime_type,
        size_bytes=image.size_bytes,
        url=f"/api/gallery/{image.id}/file",
        created_at=to_local(image.created_at),
    )


@router.get("", response_model=list[GalleryImageOut])
def list_gallery_images(
    category: GalleryCategory | None = None,
    key_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
):
    stmt = (
        select(GalleryImage, Key.code, Key.description)
        .outerjoin(Key, Key.id == GalleryImage.key_id)
        .order_by(GalleryImage.created_at.desc(), GalleryImage.id.desc())
    )
    if category is not None:
        stmt = stmt.where(GalleryImage.category == category)
    if key_id is not None:
        stmt = stmt.where(GalleryImage.key_id == key_id)

    return [
        _serialize_image(image, key_code, key_description)
        for image, key_code, key_description in db.execute(stmt)
    ]


@router.post("", response_model=GalleryImageOut, status_code=status.HTTP_201_CREATED)
def create_gallery_image(
    data: GalleryImageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    linked_key: Key | None = None
    if data.key_id is not None:
        linked_key = db.get(Key, data.key_id)
        if linked_key is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chave associada não encontrada.",
            )

    mime_type, raw = _decode_image_data(data.image_data)
    extension = MIME_TO_EXTENSION[mime_type]
    stored_name = f"{uuid4().hex}{extension}"
    file_path = _safe_file_path(stored_name)

    try:
        file_path.write_bytes(raw)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível salvar o arquivo da imagem no servidor.",
        ) from exc

    image = GalleryImage(
        name=data.name,
        description=data.description,
        category=data.category,
        key_id=linked_key.id if linked_key else None,
        file_name=stored_name,
        mime_type=mime_type,
        size_bytes=len(raw),
        created_by=user.id,
    )
    db.add(image)
    try:
        db.commit()
    except Exception:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise

    db.refresh(image)
    return _serialize_image(
        image,
        linked_key.code if linked_key else None,
        linked_key.description if linked_key else None,
    )


@router.get("/{image_id}/file")
def get_gallery_image_file(
    image_id: int,
    db: Session = Depends(get_db),
):
    image = db.get(GalleryImage, image_id)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada.",
        )

    file_path = _safe_file_path(image.file_name)
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo da imagem não encontrado.",
        )

    return FileResponse(
        path=file_path,
        media_type=image.mime_type,
        filename=image.name,
    )


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_image(
    image_id: int,
    db: Session = Depends(get_db),
):
    image = db.get(GalleryImage, image_id)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada.",
        )

    file_name = image.file_name
    db.delete(image)
    db.commit()

    _safe_file_path(file_name).unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
