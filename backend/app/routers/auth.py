from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginIn, TokenOut, UserOut
from ..security import (
    DUMMY_HASH,
    create_access_token,
    normalize_phone,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    if "@" in identifier:
        stmt = select(User).where(User.email == identifier.lower())
    else:
        stmt = select(User).where(User.phone == normalize_phone(identifier))

    user = db.scalar(stmt)
    password_ok = verify_password(
        data.password, user.password_hash if user else DUMMY_HASH
    )

    if user is None or not password_ok or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail/telefone ou senha incorretos.",
        )

    return TokenOut(access_token=create_access_token(user.id), user=user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
