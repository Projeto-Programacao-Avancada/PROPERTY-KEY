from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginIn, TokenOut, UserCreate, UserOut
from ..security import (
    DUMMY_HASH,
    create_access_token,
    hash_password,
    normalize_phone,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = str(data.email) if data.email else None
    phone = normalize_phone(data.phone) if data.phone else None

    conditions = []
    if email:
        conditions.append(User.email == email)
    if phone:
        conditions.append(User.phone == phone)

    if db.scalar(select(User.id).where(or_(*conditions)).limit(1)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário com esse e-mail ou telefone.",
        )

    user = User(
        name=data.name,
        email=email,
        phone=phone,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário com esse e-mail ou telefone.",
        )
    db.refresh(user)
    return user


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
