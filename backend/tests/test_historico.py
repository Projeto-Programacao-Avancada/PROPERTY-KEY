"""Testes da lógica de duração, atraso e médias.

Executar a partir de ``backend/``:  python -m unittest discover -s tests -t .
"""

import unittest
from datetime import datetime

from app.historico import (
    MovementRecord,
    calculate_metrics,
    format_duration,
    loan_out,
    minutes_between,
    pair_loans,
    to_local,
)

NOW = to_local(datetime(2026, 11, 20, 12, 0))
_ids = iter(range(1, 1000))


def record(kind, key_id, created_at, person_id=1, due_at=None):
    return MovementRecord(
        id=next(_ids),
        key_id=key_id,
        key_code=f"K{key_id}",
        key_description="Chave",
        person_id=person_id,
        person_name=f"Pessoa {person_id}",
        type=kind,
        notes=None,
        created_at=created_at,
        due_at=due_at,
        created_by=None,
        operator_name=None,
    )


def loans_of(*records):
    loans, index = pair_loans(records)
    return [loan_out(loan, NOW) for loan in loans], index


class FormatDurationTests(unittest.TestCase):
    def test_formats_every_range(self):
        cases = {
            0: "0 min",
            45: "45 min",
            60: "1h",
            135: "2h 15min",
            1440: "1d",
            1460: "1d 20min",
            1500: "1d 1h",
            1640: "1d 3h 20min",
        }
        for minutes, expected in cases.items():
            with self.subTest(minutes=minutes):
                self.assertEqual(format_duration(minutes), expected)

    def test_rounds_half_up_and_ignores_negative(self):
        self.assertEqual(format_duration(44.5), "45 min")
        self.assertEqual(format_duration(-5), "0 min")


class LoanTests(unittest.TestCase):
    def test_real_duration_is_exact_difference_in_minutes(self):
        loans, _ = loans_of(
            record("withdrawal", 1, datetime(2026, 11, 10, 9, 0)),
            record("return", 1, datetime(2026, 11, 10, 11, 15)),
        )
        (loan,) = loans
        self.assertEqual(loan.duracao_real_minutos, 135)
        self.assertEqual(loan.duracao_real_texto, "2h 15min")
        self.assertIsNone(loan.em_posse_minutos)

    def test_delay_is_zero_when_on_time_and_positive_when_late(self):
        due = datetime(2026, 11, 10, 10, 0)
        on_time, _ = loans_of(
            record("withdrawal", 1, datetime(2026, 11, 10, 9, 0), due_at=due),
            record("return", 1, datetime(2026, 11, 10, 9, 50)),
        )
        late, _ = loans_of(
            record("withdrawal", 2, datetime(2026, 11, 10, 9, 0), due_at=due),
            record("return", 2, datetime(2026, 11, 10, 10, 30)),
        )
        self.assertEqual((on_time[0].atraso_minutos, on_time[0].status), (0, "returned_on_time"))
        self.assertEqual((late[0].atraso_minutos, late[0].status), (30, "returned_late"))

    def test_missing_due_date_gives_null_delay_without_breaking(self):
        (loan,), _ = loans_of(
            record("withdrawal", 1, datetime(2026, 11, 10, 9, 0)),
            record("return", 1, datetime(2026, 11, 10, 10, 0)),
        )
        self.assertIsNone(loan.atraso_minutos)
        self.assertEqual(loan.status, "returned")
        self.assertEqual(loan.duracao_real_minutos, 60)

    def test_open_loan_reports_elapsed_time_only(self):
        (loan,), _ = loans_of(record("withdrawal", 1, datetime(2026, 11, 20, 9, 30)))
        self.assertEqual(loan.status, "in_possession")
        self.assertEqual(loan.em_posse_minutos, 150)
        self.assertIsNone(loan.duracao_real_minutos)
        self.assertIsNone(loan.atraso_minutos)

    def test_pairs_per_key_and_keeps_borrower_from_withdrawal(self):
        w1 = record("withdrawal", 1, datetime(2026, 11, 10, 9, 0), person_id=1)
        w2 = record("withdrawal", 2, datetime(2026, 11, 10, 9, 5), person_id=2)
        r1 = record("return", 1, datetime(2026, 11, 10, 9, 30), person_id=3)  # outra pessoa devolveu
        loans, index = loans_of(w1, w2, r1)
        by_id = {loan.id: loan for loan in loans}
        self.assertEqual(by_id[w1.id].person_id, 1)
        self.assertEqual(by_id[w1.id].duracao_real_minutos, 30)
        self.assertEqual(by_id[w2.id].status, "in_possession")
        self.assertIs(index[r1.id], index[w1.id])

    def test_inconsistent_history_is_not_counted_as_in_possession(self):
        first = record("withdrawal", 1, datetime(2026, 11, 10, 9, 0))
        second = record("withdrawal", 1, datetime(2026, 11, 11, 9, 0))
        orphan_return = record("return", 5, datetime(2026, 11, 11, 9, 0))
        loans, index = loans_of(first, second, orphan_return)
        by_id = {loan.id: loan for loan in loans}
        self.assertEqual(by_id[first.id].status, "unreturned")
        self.assertEqual(by_id[second.id].status, "in_possession")
        self.assertNotIn(orphan_return.id, index)

    def test_same_second_return_is_ordered_by_id(self):
        moment = datetime(2026, 11, 10, 9, 0)
        (loan,), _ = loans_of(
            record("withdrawal", 1, moment), record("return", 1, moment)
        )
        self.assertEqual(loan.duracao_real_minutos, 0)

    def test_minutes_between_never_negative(self):
        self.assertEqual(minutes_between(NOW, to_local(datetime(2026, 11, 19))), 0)


class MetricsTests(unittest.TestCase):
    def setUp(self):
        due = datetime(2026, 11, 10, 10, 0)
        self.loans, _ = loans_of(
            # 60 min, no prazo
            record("withdrawal", 1, datetime(2026, 11, 10, 9, 0), due_at=due),
            record("return", 1, datetime(2026, 11, 10, 10, 0)),
            # 150 min, 90 min de atraso
            record("withdrawal", 2, datetime(2026, 11, 10, 9, 0), due_at=due),
            record("return", 2, datetime(2026, 11, 10, 11, 30)),
            # 180 min, sem prazo
            record("withdrawal", 3, datetime(2026, 11, 10, 8, 0)),
            record("return", 3, datetime(2026, 11, 10, 11, 0)),
            # em aberto
            record("withdrawal", 4, datetime(2026, 11, 20, 9, 0)),
        )

    def test_averages_ignore_open_loans_and_missing_deadlines(self):
        metrics = calculate_metrics(self.loans)
        self.assertEqual(metrics.total_retiradas, 4)
        self.assertEqual(metrics.em_posse, 1)
        self.assertEqual(metrics.devolucoes_concluidas, 3)
        self.assertEqual(metrics.duracao_media_minutos, (60 + 150 + 180) / 3)
        self.assertEqual(metrics.duracao_media_texto, "2h 10min")
        self.assertEqual(metrics.devolucoes_com_prazo, 2)
        self.assertEqual(metrics.devolucoes_com_atraso, 1)
        self.assertEqual(metrics.taxa_atraso, 0.5)
        self.assertEqual(metrics.atraso_medio_minutos, 45.0)  # (0 + 90) / 2
        self.assertEqual(metrics.atraso_medio_texto, "45 min")

    def test_empty_and_open_only_have_null_averages(self):
        for loans in ([], self.loans[-1:]):
            metrics = calculate_metrics(loans)
            self.assertIsNone(metrics.duracao_media_minutos)
            self.assertIsNone(metrics.atraso_medio_minutos)
            self.assertIsNone(metrics.taxa_atraso)
            self.assertEqual(metrics.devolucoes_concluidas, 0)


if __name__ == "__main__":
    unittest.main()
