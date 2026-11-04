from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Key, KeyMovement, Person, User
from ..schemas import (
    HistoryMovementOut,
    MovementKeyOut,
    MovementRelatedOut,
)

router = APIRouter(
    prefix="/movements",
    tags=["historico"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[HistoryMovementOut])
def list_history(db: Session = Depends(get_db)):
    rows = db.execute(
        select(KeyMovement, Key.code, Key.description, Person.name, User.name)
        .join(Key, Key.id == KeyMovement.key_id)
        .outerjoin(Person, Person.id == KeyMovement.person_id)
        .outerjoin(User, User.id == KeyMovement.created_by)
        .order_by(KeyMovement.created_at.desc(), KeyMovement.id.desc())
    )

    movements = []
    for movement, code, description, person_name, operator_name in rows:
        created_at = movement.created_at
        if created_at.tzinfo is None:
            created_at = created_at.astimezone()

        movements.append(
            HistoryMovementOut(
                id=movement.id,
                key_id=movement.key_id,
                person_id=movement.person_id,
                type=movement.type,
                notes=movement.notes,
                created_at=created_at,
                created_by=movement.created_by,
                key=MovementKeyOut(code=code, description=description),
                person=(MovementRelatedOut(name=person_name) if person_name else None),
                operator=(
                    MovementRelatedOut(name=operator_name) if operator_name else None
                ),
            )
        )
    return movements
