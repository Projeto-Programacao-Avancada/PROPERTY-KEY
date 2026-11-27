from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..historico import now_local, to_local, to_naive_local
from ..models import GalleryImage, Key, KeyMovement, Person, User
from ..schemas import KeyCreate, KeyOut, KeyReturnIn, KeyWithdrawalIn

router = APIRouter(prefix="/keys", tags=["keys"], dependencies=[Depends(get_current_user)])

DUPLICATE_MSG = "Já existe uma chave com esse código."
PAST_DUE_MSG = "A previsão de devolução deve ser uma data futura."


def _due_fields(movement: KeyMovement | None, withdrawn: bool) -> dict:
    """Campos de KeyOut que dependem da retirada em andamento."""
    if not withdrawn or movement is None:
        return {}
    return {
        "responsible_id": movement.person_id,
        "since": movement.created_at,
        "expected_return_at": to_local(movement.due_at) if movement.due_at else None,
    }


def _count_key_images(db: Session, key_id: int) -> int:
    return int(
        db.scalar(select(func.count(GalleryImage.id)).where(GalleryImage.key_id == key_id))
        or 0
    )


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
    image_counts = (
        select(
            GalleryImage.key_id.label("key_id"),
            func.count(GalleryImage.id).label("image_count"),
        )
        .where(GalleryImage.key_id.is_not(None))
        .group_by(GalleryImage.key_id)
        .subquery()
    )
    rows = db.execute(
        select(
            Key,
            KeyMovement,
            Person.name,
            func.coalesce(image_counts.c.image_count, 0),
        )
        .outerjoin(latest_movement, latest_movement.c.key_id == Key.id)
        .outerjoin(KeyMovement, KeyMovement.id == latest_movement.c.movement_id)
        .outerjoin(Person, Person.id == KeyMovement.person_id)
        .outerjoin(image_counts, image_counts.c.key_id == Key.id)
        .order_by(Key.code)
    )
    result = []
    for key, movement, person_name, image_count in rows:
        withdrawn = key.status == "withdrawn" and movement is not None
        result.append(
            KeyOut(
                id=key.id,
                code=key.code,
                description=key.description,
                status=key.status,
                responsible=person_name if withdrawn else None,
                image_count=int(image_count or 0),
                **_due_fields(movement, withdrawn),
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
    withdrawn = key.status == "withdrawn" and movement is not None
    responsible = None
    if withdrawn:
        responsible = db.scalar(
            select(Person.name).where(Person.id == movement.person_id)
        )

    return KeyOut(
        id=key.id,
        code=key.code,
        description=key.description,
        status=key.status,
        responsible=responsible,
        image_count=_count_key_images(db, key.id),
        **_due_fields(movement, withdrawn),
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
        # O schema MySQL usa ON DELETE CASCADE/SET NULL; manter explícito garante
        # o mesmo comportamento no SQLite local, que não ativa FKs por padrão.
        db.execute(
            update(GalleryImage)
            .where(GalleryImage.key_id == key.id)
            .values(key_id=None)
        )
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

    # Tolerância de 1 minuto para relógios do navegador levemente adiantados.
    if data.expected_return_at is not None and (
        (to_local(data.expected_return_at) - now_local()).total_seconds() < -60
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, PAST_DUE_MSG)

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
            due_at=(
                to_naive_local(data.expected_return_at)
                if data.expected_return_at is not None
                else None
            ),
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
        image_count=_count_key_images(db, key.id),
        **_due_fields(movement, True),
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
        image_count=_count_key_images(db, key.id),
    )
