from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..historico import calculate_metrics, load_loans
from ..models import Person
from ..schemas import (
    PersonCreate,
    PersonDetailOut,
    PersonHistoryOut,
    PersonOut,
)

router = APIRouter(
    prefix="/people", tags=["people"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[PersonOut])
def list_people(db: Session = Depends(get_db)):
    loans_by_person = defaultdict(list)
    for loan in load_loans(db):
        loans_by_person[loan.person_id].append(loan)

    return [
        PersonOut(
            id=person.id,
            name=person.name,
            phone=person.phone,
            email=person.email,
            metrics=calculate_metrics(loans_by_person[person.id]),
        )
        for person in db.scalars(select(Person).order_by(Person.name))
    ]


@router.get("/{person_id}/history", response_model=PersonHistoryOut)
def person_history(person_id: int, db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pessoa não encontrada.")

    loans = [loan for loan in load_loans(db) if loan.person_id == person_id]
    return PersonHistoryOut(
        person=PersonDetailOut.model_validate(person),
        summary=calculate_metrics(loans),
        loans=loans,
    )


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(data: PersonCreate, db: Session = Depends(get_db)):
    person = Person(
        name=data.name.strip(),
        phone=data.phone,
        email=data.email,
        document=data.document,
    )
    db.add(person)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe uma pessoa com esse documento.",
        )
    db.refresh(person)
    return person
