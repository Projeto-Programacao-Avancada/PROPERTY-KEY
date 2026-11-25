from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Key, KeyMovement, Person, User
from ..schemas import KeyCreate, KeyOut, KeyReturnIn, KeyWithdrawalIn

router = APIRouter(prefix="/keys", tags=["keys"], dependencies=[Depends(get_current_user)])

DUPLICATE_MSG = "Já existe uma chave com esse código."


@router.get("", response_model=list[KeyOut])
def list_keys(db: Session = Depends(get_db)):
    latest_movement = (
        select(
            KeyMovement.key_id.label("key_id"),
            func.max(KeyMovement.id).label("movement_id"),
        )
        .group_by(KeyMovement.key_id)
        .subquery()
    )
    rows = db.execute(
        select(Key, KeyMovement, Person.name)
        .outerjoin(latest_movement, latest_movement.c.key_id == Key.id)
        .outerjoin(KeyMovement, KeyMovement.id == latest_movement.c.movement_id)
        .outerjoin(Person, Person.id == KeyMovement.person_id)
        .order_by(Key.code)
    )
    result = []
    for key, movement, person_name in rows:
        withdrawn = key.status == "withdrawn" and movement is not None
        result.append(
            KeyOut(
                id=key.id,
                code=key.code,
                description=key.description,
                status=key.status,
                responsible=person_name if withdrawn else None,
                since=movement.created_at if withdrawn else None,
            )
        )
    return result


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


@router.put("/{key_id}", response_model=KeyOut)
def update_key(
    key_id: int,
    data: KeyCreate,
    db: Session = Depends(get_db),
):
    key = db.scalar(select(Key).where(Key.id == key_id).with_for_update())
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chave não encontrada.")

    duplicate_id = db.scalar(
        select(Key.id).where(Key.code == data.code, Key.id != key_id)
    )
    if duplicate_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, DUPLICATE_MSG)

    key.code = data.code
    key.description = data.description
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, DUPLICATE_MSG)

    movement = db.scalar(
        select(KeyMovement)
        .where(KeyMovement.key_id == key.id)
        .order_by(KeyMovement.id.desc())
    )
    responsible = None
    since = None
    if key.status == "withdrawn" and movement is not None:
        responsible = db.scalar(
            select(Person.name).where(Person.id == movement.person_id)
        )
        since = movement.created_at

    return KeyOut(
        id=key.id,
        code=key.code,
        description=key.description,
        status=key.status,
        responsible=responsible,
        since=since,
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_key(
    key_id: int,
    db: Session = Depends(get_db),
):
    key = db.scalar(select(Key).where(Key.id == key_id).with_for_update())
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chave não encontrada.")
    if key.status != "available":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Devolva a chave antes de excluí-la.",
        )

    try:
        # O schema MySQL usa ON DELETE CASCADE; remover explicitamente também
        # mantém o mesmo comportamento no SQLite local, que não ativa FKs por padrão.
        db.execute(delete(KeyMovement).where(KeyMovement.key_id == key.id))
        db.delete(key)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Não foi possível excluir esta chave por causa dos dados associados.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{key_id}/withdraw", response_model=KeyOut)
def withdraw_key(
    key_id: int,
    data: KeyWithdrawalIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    key = db.scalar(select(Key).where(Key.id == key_id).with_for_update())
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chave não encontrada.")
    if key.status != "available":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta chave já está retirada.")

    person = db.scalar(select(Person).where(Person.document == data.document))
    if person is not None and person.name.casefold() != data.responsible_name.casefold():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este documento já está vinculado a outro nome.",
        )
    if person is None:
        person = Person(name=data.responsible_name, document=data.document)
        db.add(person)

    try:
        db.flush()
        movement = KeyMovement(
            key_id=key.id,
            person_id=person.id,
            type="withdrawal",
            notes=data.notes,
            created_by=user.id,
        )
        key.status = "withdrawn"
        db.add(movement)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este documento já está cadastrado para outro responsável.",
        )
    db.refresh(movement)
    return KeyOut(
        id=key.id,
        code=key.code,
        description=key.description,
        status=key.status,
        responsible=person.name,
        since=movement.created_at,
    )


@router.post("/{key_id}/return", response_model=KeyOut)
def return_key(
    key_id: int,
    data: KeyReturnIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    key = db.scalar(select(Key).where(Key.id == key_id).with_for_update())
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chave não encontrada.")
    if key.status != "withdrawn":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta chave já está disponível.")

    person = None
    if data.document:
        person = db.scalar(select(Person).where(Person.document == data.document))
        if person is not None and person.name.casefold() != data.responsible_name.casefold():
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Este documento já está vinculado a outro nome.",
            )
    if person is None:
        person = Person(name=data.responsible_name, document=data.document)
        db.add(person)

    try:
        db.flush()
        db.add(
            KeyMovement(
                key_id=key.id,
                person_id=person.id,
                type="return",
                notes=data.notes,
                created_by=user.id,
            )
        )
        key.status = "available"
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este documento já está cadastrado para outro responsável.",
        )
    db.refresh(key)
    return KeyOut(
        id=key.id,
        code=key.code,
        description=key.description,
        status=key.status,
    )
