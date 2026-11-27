from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError

from .config import settings
from .database import engine
from .models import GalleryImage
from .routers import api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        GalleryImage.__table__.create(bind=engine, checkfirst=True)
    except SQLAlchemyError:
        pass
    yield


app = FastAPI(title="Controle de Chaves API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    msg = str(first.get("msg", "Dados inválidos.")).removeprefix("Value error, ")
    return JSONResponse(status_code=422, content={"detail": msg})


@app.exception_handler(OperationalError)
async def db_unavailable_handler(_: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Não foi possível conectar ao MySQL. Confira o DATABASE_URL."},
    )


@app.exception_handler(ProgrammingError)
async def db_schema_handler(_: Request, exc: ProgrammingError):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Tabela não encontrada no banco. Execute o arquivo mysql/schema.sql."
        },
    )
