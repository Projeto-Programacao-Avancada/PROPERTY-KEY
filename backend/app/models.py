from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base

# BIGINT no MySQL; INTEGER no SQLite (necessário para autoincrement em testes)
BigId = BigInteger().with_variant(Integer, "sqlite")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Key(Base):
    __tablename__ = "keys"
    __table_args__ = (
        CheckConstraint("status in ('available', 'withdrawn')", name="keys_status_check"),
    )

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    description: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="available", server_default="available")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("users.id", ondelete="SET NULL")
    )


class Person(Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class KeyMovement(Base):
    __tablename__ = "key_movements"
    __table_args__ = (
        CheckConstraint("type in ('withdrawal', 'return')", name="movements_type_check"),
    )

    id: Mapped[int] = mapped_column(BigId, primary_key=True, autoincrement=True)
    key_id: Mapped[int] = mapped_column(BigId, ForeignKey("keys.id", ondelete="CASCADE"))
    person_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("people.id", ondelete="SET NULL")
    )
    type: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("users.id", ondelete="SET NULL")
    )
