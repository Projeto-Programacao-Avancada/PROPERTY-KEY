"""Histórico de movimentações e métricas de posse das chaves.

As movimentações são eventos soltos (``withdrawal`` / ``return``). Cada retirada é
pareada com a próxima devolução da mesma chave, formando um empréstimo (``Loan``).
Toda a lógica de duração, atraso e médias fica aqui para ser reaproveitada pelos
routers de histórico e de pessoas.
"""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Key, KeyMovement, Person, User
from .schemas import (
    LoanMetricsOut,
    LoanOut,
    MovementKeyOut,
    MovementRelatedOut,
)

STATUS_LABELS = {
    "in_possession": "Em posse",
    "returned_on_time": "Devolvida no prazo",
    "returned_late": "Devolvida com atraso",
    "returned": "Devolvida",  # devolvida, mas a retirada não tinha prazo definido
    "unreturned": "Sem devolução registrada",  # dado inconsistente (nova retirada sem devolução)
}
PERIOD_ERROR = "A data final deve ser igual ou posterior à data inicial."


# --------------------------------------------------------------------------- tempo


def to_local(value: datetime) -> datetime:
    """Datas do banco são naive no horário local do servidor; torna-as explícitas."""
    return value.astimezone() if value.tzinfo is None else value


def to_naive_local(value: datetime) -> datetime:
    """Inverso de ``to_local``: formato gravado nas colunas DATETIME."""
    return to_local(value).astimezone().replace(tzinfo=None)


def now_local() -> datetime:
    return datetime.now().astimezone()


def minutes_between(start: datetime, end: datetime) -> int:
    """Minutos inteiros (truncados) entre dois instantes; nunca negativo."""
    return max(0, int((end - start).total_seconds() // 60))


def format_duration(minutes: float) -> str:
    """``45 min``, ``2h 15min``, ``1d 3h 20min``."""
    total = max(0, int(minutes + 0.5))
    days, rest = divmod(total, 1440)
    hours, mins = divmod(rest, 60)
    if not days and not hours:
        return f"{mins} min"
    parts = [f"{days}d"] if days else []
    if hours:
        parts.append(f"{hours}h")
    if mins:
        parts.append(f"{mins}min")
    return " ".join(parts)


def _related(name: str | None) -> MovementRelatedOut | None:
    return MovementRelatedOut(name=name) if name else None


# ------------------------------------------------------------------ empréstimos


@dataclass(frozen=True)
class MovementRecord:
    id: int
    key_id: int
    key_code: str
    key_description: str
    person_id: int | None
    person_name: str | None
    type: str
    notes: str | None
    created_at: datetime
    due_at: datetime | None
    created_by: int | None
    operator_name: str | None


@dataclass
class Loan:
    withdrawal: MovementRecord
    returned: MovementRecord | None = None
    # Última retirada da chave ainda sem devolução, ou seja, a chave segue com a pessoa.
    open: bool = True


def load_records(db: Session) -> list[MovementRecord]:
    """Todas as movimentações, da mais recente para a mais antiga."""
    rows = db.execute(
        select(KeyMovement, Key.code, Key.description, Person.name, User.name)
        .join(Key, Key.id == KeyMovement.key_id)
        .outerjoin(Person, Person.id == KeyMovement.person_id)
        .outerjoin(User, User.id == KeyMovement.created_by)
        .order_by(KeyMovement.created_at.desc(), KeyMovement.id.desc())
    )
    return [
        MovementRecord(
            id=m.id,
            key_id=m.key_id,
            key_code=code,
            key_description=description,
            person_id=m.person_id,
            person_name=person_name,
            type=m.type,
            notes=m.notes,
            created_at=m.created_at,
            due_at=m.due_at,
            created_by=m.created_by,
            operator_name=operator_name,
        )
        for m, code, description, person_name, operator_name in rows
    ]


def pair_loans(records: Iterable[MovementRecord]) -> tuple[list[Loan], dict[int, Loan]]:
    """Pareia retiradas e devoluções por chave.

    Devolve os empréstimos e um índice ``id da movimentação -> empréstimo``. Uma
    devolução sem retirada anterior fica fora do índice (registro legado).
    """
    by_key: dict[int, list[MovementRecord]] = defaultdict(list)
    for record in records:
        by_key[record.key_id].append(record)

    loans: list[Loan] = []
    index: dict[int, Loan] = {}
    for events in by_key.values():
        events.sort(key=lambda r: (to_local(r.created_at), r.id))
        current: Loan | None = None
        for record in events:
            if record.type == "withdrawal":
                if current is not None:
                    current.open = False  # retirada anterior nunca foi devolvida
                current = Loan(withdrawal=record)
                loans.append(current)
                index[record.id] = current
            elif current is not None:
                current.returned = record
                current.open = False
                index[record.id] = current
                current = None
    return loans, index


def loan_out(loan: Loan, now: datetime) -> LoanOut:
    withdrawal, returned = loan.withdrawal, loan.returned
    retirado = to_local(withdrawal.created_at)
    previsto = to_local(withdrawal.due_at) if withdrawal.due_at else None
    devolvido = to_local(returned.created_at) if returned else None

    duracao = minutes_between(retirado, devolvido) if devolvido else None
    em_posse = minutes_between(retirado, now) if loan.open else None
    atraso = minutes_between(previsto, devolvido) if devolvido and previsto else None

    if loan.open:
        loan_status = "in_possession"
    elif devolvido is None:
        loan_status = "unreturned"
    elif atraso is None:
        loan_status = "returned"
    else:
        loan_status = "returned_late" if atraso > 0 else "returned_on_time"

    return LoanOut(
        id=withdrawal.id,
        key_id=withdrawal.key_id,
        key=MovementKeyOut(code=withdrawal.key_code, description=withdrawal.key_description),
        person_id=withdrawal.person_id,
        person=_related(withdrawal.person_name),
        retirado_em=retirado,
        previsto_em=previsto,
        devolvido_em=devolvido,
        status=loan_status,
        status_label=STATUS_LABELS[loan_status],
        duracao_real_minutos=duracao,
        duracao_real_texto=format_duration(duracao) if duracao is not None else None,
        em_posse_minutos=em_posse,
        atraso_minutos=atraso,
    )


def load_loans(db: Session, now: datetime | None = None) -> list[LoanOut]:
    """Todos os empréstimos, do mais recente para o mais antigo."""
    now = now or now_local()
    loans, _ = pair_loans(load_records(db))
    result = [loan_out(loan, now) for loan in loans]
    result.sort(key=lambda item: (item.retirado_em, item.id), reverse=True)
    return result


# ---------------------------------------------------------------------- métricas


def _mean(values: list[int]) -> float | None:
    return round(sum(values) / len(values), 1) if values else None


def calculate_metrics(loans: Iterable[LoanOut]) -> LoanMetricsOut:
    """Totais, duração média de posse e média de demora de uma lista de empréstimos.

    Empréstimos em aberto não entram nas médias. A média de demora considera apenas
    devoluções com prazo definido (devolução no prazo conta como 0 minuto).
    """
    loans = list(loans)
    durations = [l.duracao_real_minutos for l in loans if l.duracao_real_minutos is not None]
    delays = [l.atraso_minutos for l in loans if l.atraso_minutos is not None]
    late = sum(1 for delay in delays if delay > 0)
    average_duration = _mean(durations)
    average_delay = _mean(delays)

    return LoanMetricsOut(
        total_retiradas=len(loans),
        em_posse=sum(1 for l in loans if l.status == "in_possession"),
        devolucoes_concluidas=len(durations),
        duracao_media_minutos=average_duration,
        duracao_media_texto=format_duration(average_duration) if average_duration is not None else None,
        devolucoes_com_prazo=len(delays),
        devolucoes_com_atraso=late,
        taxa_atraso=round(late / len(delays), 4) if delays else None,
        atraso_medio_minutos=average_delay,
        atraso_medio_texto=format_duration(average_delay) if average_delay is not None else None,
    )
