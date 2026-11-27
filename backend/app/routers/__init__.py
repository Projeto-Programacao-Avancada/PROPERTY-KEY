from fastapi import APIRouter

from . import ai, auth, gallery, keys, movements, people

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(keys.router)
api_router.include_router(movements.router)
api_router.include_router(people.router)
api_router.include_router(gallery.router)
api_router.include_router(ai.router)

__all__ = [
    "ai",
    "api_router",
    "auth",
    "gallery",
    "keys",
    "movements",
    "people",
]
