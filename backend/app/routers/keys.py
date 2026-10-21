from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Key, User
from ..schemas import KeyCreate, KeyOut

router = APIRouter(prefix="/keys", tags=["keys"], dependencies=[Depends(get_current_user)])

DUPLICATE_MSG = "Já existe uma chave com esse código."


@router.get("", response_model=list[KeyOut])
def list_keys(db: Session = Depends(get_db)):
    return db.scalars(select(Key).order_by(Key.code)).all()


@router.post("", response_model=KeyOut, status_code=status.HTTP_201_CREATED)
def create_key(
    data: KeyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # A coluna usa collation case-insensitive; o código já vem em maiúsculas.
    if db.scalar(select(Key.id).where(Key.code == data.code)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, DUPLICATE_MSG)

    key = Key(code=data.code, description=data.description, created_by=user.id)
    db.add(key)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, DUPLICATE_MSG)
    db.refresh(key)
    return key
