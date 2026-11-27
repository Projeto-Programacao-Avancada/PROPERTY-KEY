from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..historico import (
    PERIOD_ERROR,
    calculate_metrics,
    load_records,
    loan_out,
    now_local,
    pair_loans,
    to_local,
)
from ..schemas import (
    HistoryMovementOut,
    HistoryOut,
    LoanOut,
    MovementKeyOut,
    MovementRelatedOut,
)

router = APIRouter(
    prefix="/movements",
    tags=["movements"],
    dependencies=[Depends(get_current_user)],
)


def _related(name: str | None) -> MovementRelatedOut | None:
    return MovementRelatedOut(name=name) if name else None


@router.get("", response_model=HistoryOut)
def list_history(
    person_id: int | None = Query(default=None, ge=1),
    key_id: int | None = Query(default=None, ge=1),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    """Movimentações (mais recentes primeiro) e métricas dos empréstimos envolvidos.

    ``person_id`` filtra pela pessoa que retirou a chave; as datas usam o dia local
    do servidor. O resumo cobre cada empréstimo ligado às movimentações filtradas.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, PERIOD_ERROR)

    now = now_local()
    records = load_records(db)
    loans, index = pair_loans(records)
    loan_outs = {loan.withdrawal.id: loan_out(loan, now) for loan in loans}

    movements: list[HistoryMovementOut] = []
    selected: dict[int, LoanOut] = {}
    for record in records:
        loan = index.get(record.id)
        loan_data = loan_outs[loan.withdrawal.id] if loan else None
        created_at = to_local(record.created_at)

        borrower_id = loan_data.person_id if loan_data else record.person_id
        if (
            (person_id is not None and borrower_id != person_id)
            or (key_id is not None and record.key_id != key_id)
            or (start_date and created_at.date() < start_date)
            or (end_date and created_at.date() > end_date)
        ):
            continue

        if loan_data:
            selected[loan_data.id] = loan_data
        movements.append(
            HistoryMovementOut(
                id=record.id,
                key_id=record.key_id,
                person_id=record.person_id,
                type=record.type,
                notes=record.notes,
                created_at=created_at,
                created_by=record.created_by,
                key=MovementKeyOut(code=record.key_code, description=record.key_description),
                person=_related(record.person_name),
                operator=_related(record.operator_name),
                loan=loan_data,
            )
        )
    return HistoryOut(movements=movements, summary=calculate_metrics(selected.values()))
