from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Person
from ..schemas import PersonCreate, PersonOut

router = APIRouter(
    prefix="/people", tags=["people"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[PersonOut])
def list_people(db: Session = Depends(get_db)):
    return db.scalars(select(Person).order_by(Person.name)).all()


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(data: PersonCreate, db: Session = Depends(get_db)):
    person = Person(name=data.name.strip(), phone=data.phone, email=data.email)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person
