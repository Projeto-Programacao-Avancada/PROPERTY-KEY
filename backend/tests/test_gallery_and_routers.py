"""Testes da Galeria e da padronização de routers do backend.

Executar a partir de ``backend/``:  python -m unittest discover -s tests -t .
"""

import base64
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-more-than-32-characters-123456")

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.main import app
from app.models import GalleryImage, Key, User
from app.routers.gallery import (
    _decode_image_data,
    create_gallery_image,
    delete_gallery_image,
    get_gallery_image_file,
    list_gallery_images,
)
from app.routers.keys import delete_key, list_keys
from app.schemas import GalleryImageCreate

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)
TINY_PNG_DATA_URL = "data:image/png;base64," + base64.b64encode(TINY_PNG).decode("ascii")


class RouterPatternTests(unittest.TestCase):
    def test_api_router_exposes_all_expected_resource_paths(self):
        paths = set(app.openapi()["paths"].keys())
        expected = {
            "/api/health",
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/me",
            "/api/keys",
            "/api/keys/{key_id}",
            "/api/keys/{key_id}/withdraw",
            "/api/keys/{key_id}/return",
            "/api/movements",
            "/api/people",
            "/api/people/{person_id}/history",
            "/api/gallery",
            "/api/gallery/{image_id}/file",
            "/api/gallery/{image_id}",
            "/api/ai/status",
            "/api/ai/predict",
        }
        self.assertTrue(expected.issubset(paths), f"Rotas ausentes: {expected - paths}")


class GalleryDecodeTests(unittest.TestCase):
    def test_accepts_valid_png_data_url(self):
        mime, raw = _decode_image_data(TINY_PNG_DATA_URL)
        self.assertEqual(mime, "image/png")
        self.assertEqual(raw, TINY_PNG)

    def test_rejects_spoofed_magic_bytes(self):
        fake = "data:image/png;base64," + base64.b64encode(b"not-a-png").decode("ascii")
        with self.assertRaises(HTTPException) as ctx:
            _decode_image_data(fake)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_rejects_unsupported_mime_type(self):
        svg = "data:image/svg+xml;base64," + base64.b64encode(b"<svg/>").decode("ascii")
        with self.assertRaises(HTTPException) as ctx:
            _decode_image_data(svg)
        self.assertEqual(ctx.exception.status_code, 422)


class GalleryCrudTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.db = self.Session()

        self.user = User(name="Operador", email="op@exemplo.com", password_hash="hash")
        self.key = Key(code="A01", description="Apto 101", status="available")
        self.db.add_all([self.user, self.key])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.key)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.temp_dir.cleanup()

    def test_upload_list_serve_and_delete_gallery_image(self):
        with patch("app.routers.gallery.settings.upload_dir", self.temp_dir.name):
            created = create_gallery_image(
                GalleryImageCreate(
                    name="fachada.png",
                    description="Vista frontal",
                    category="Fachada",
                    key_id=self.key.id,
                    image_data=TINY_PNG_DATA_URL,
                ),
                db=self.db,
                user=self.user,
            )

            self.assertEqual(created.name, "fachada.png")
            self.assertEqual(created.key_id, self.key.id)
            self.assertEqual(created.key_code, "A01")
            self.assertEqual(created.url, f"/api/gallery/{created.id}/file")

            listed = list_gallery_images(category=None, key_id=None, db=self.db)
            self.assertEqual(len(listed), 1)
            self.assertEqual(listed[0].id, created.id)

            keys = list_keys(db=self.db)
            self.assertEqual(keys[0].image_count, 1)

            file_response = get_gallery_image_file(created.id, db=self.db)
            saved_path = Path(file_response.path)
            self.assertTrue(saved_path.is_file())
            self.assertEqual(saved_path.read_bytes(), TINY_PNG)

            delete_gallery_image(created.id, db=self.db)
            self.assertFalse(saved_path.exists())
            self.assertEqual(list_gallery_images(category=None, key_id=None, db=self.db), [])
            self.assertEqual(list_keys(db=self.db)[0].image_count, 0)

    def test_deleting_key_unlinks_gallery_images_without_deleting_them(self):
        with patch("app.routers.gallery.settings.upload_dir", self.temp_dir.name):
            created = create_gallery_image(
                GalleryImageCreate(
                    name="chave.png",
                    description=None,
                    category="Chave",
                    key_id=self.key.id,
                    image_data=TINY_PNG_DATA_URL,
                ),
                db=self.db,
                user=self.user,
            )
            delete_key(self.key.id, db=self.db)
            image = self.db.get(GalleryImage, created.id)
            self.assertIsNotNone(image)
            self.assertIsNone(image.key_id)


if __name__ == "__main__":
    unittest.main()
