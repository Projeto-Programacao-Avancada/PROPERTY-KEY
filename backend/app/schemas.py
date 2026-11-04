from datetime import datetime
import re
import unicodedata

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class LoginIn(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=25)
    password: str = Field(min_length=8, max_length=255)

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Informe seu nome.")
        return value

    @field_validator("email")
    @classmethod
    def _email(cls, value: EmailStr | None) -> str | None:
        return str(value).strip().lower() if value is not None else None

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        digits = re.sub(r"\D", "", value)
        if not 10 <= len(digits) <= 15:
            raise ValueError("Informe um telefone válido com DDD.")
        return value

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("A senha deve ter no máximo 72 bytes.")
        return value

    @model_validator(mode="after")
    def _require_contact(self):
        if not self.email and not self.phone:
            raise ValueError("Informe um e-mail ou telefone.")
        return self


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class KeyCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=120)

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Informe o código.")
        return v

    @field_validator("description")
    @classmethod
    def _description(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Informe a descrição.")
        return v


class KeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    description: str
    status: str
    responsible: str | None = None
    since: datetime | None = None


class KeyWithdrawalIn(BaseModel):
    responsible_name: str = Field(min_length=1, max_length=120)
    document: str = Field(min_length=1, max_length=30)
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("responsible_name")
    @classmethod
    def _responsible_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Informe o nome do responsável.")
        return value

    @field_validator("document")
    @classmethod
    def _document(cls, value: str) -> str:
        value = unicodedata.normalize("NFKC", value).upper()
        value = re.sub(r"[^A-Z0-9]", "", value)
        if not value:
            raise ValueError("Informe o CPF ou documento.")
        if len(value) > 30:
            raise ValueError("O documento deve ter no máximo 30 caracteres.")
        return value

    @field_validator("notes")
    @classmethod
    def _notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class KeyReturnIn(BaseModel):
    responsible_name: str = Field(min_length=1, max_length=120)
    document: str | None = Field(default=None, max_length=30)
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("responsible_name")
    @classmethod
    def _responsible_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Informe quem está devolvendo a chave.")
        return value

    @field_validator("document")
    @classmethod
    def _document(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = unicodedata.normalize("NFKC", value).upper()
        value = re.sub(r"[^A-Z0-9]", "", value)
        return value or None

    @field_validator("notes")
    @classmethod
    def _notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class MovementRelatedOut(BaseModel):
    name: str


class MovementKeyOut(BaseModel):
    code: str
    description: str


class HistoryMovementOut(BaseModel):
    id: int
    key_id: int
    person_id: int | None
    type: str
    notes: str | None
    created_at: datetime
    created_by: int | None
    key: MovementKeyOut
    person: MovementRelatedOut | None
    operator: MovementRelatedOut | None


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    document: str | None = Field(default=None, max_length=30)

    @field_validator("document")
    @classmethod
    def _document(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = unicodedata.normalize("NFKC", value).upper()
        value = re.sub(r"[^A-Z0-9]", "", value)
        return value or None


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str | None
    email: str | None
