from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, ProgrammingError

from .config import settings
from .routers import auth, keys, people

app = FastAPI(title="Controle de Chaves API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(keys.router, prefix="/api")
app.include_router(people.router, prefix="/api")


@app.get("/api/health")
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
