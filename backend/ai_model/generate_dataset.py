"""Gera dados sintéticos para demonstrar a previsão de atraso de devolução."""
from pathlib import Path
import numpy as np
import pandas as pd

SEED = 42
N = 8000
OUT = Path(__file__).parent / "data" / "synthetic_withdrawals.csv"

def main():
    rng = np.random.default_rng(SEED)
    hour = rng.integers(6, 23, N)
    weekday = rng.integers(0, 7, N)
    key_id = rng.integers(1, 101, N)
    person_id = rng.integers(1, 501, N)
    is_weekend = (weekday >= 5).astype(int)
    # Duração sintética em minutos: padrões simulados, não observações reais.
    mean = 55 + (hour >= 17) * 210 + is_weekend * 125 + (key_id % 7) * 18
    duration = rng.lognormal(np.log(mean), 0.38, N)
    late = (duration > 240).astype(int)
    frame = pd.DataFrame({
        "hour": hour, "weekday": weekday, "key_id": key_id,
        "person_id": person_id, "is_weekend": is_weekend,
        "late": late, "duration_minutes": duration.round().astype(int),
    })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(OUT, index=False)
    print(f"Base sintética criada: {OUT}")
    print(f"Registros: {len(frame)} | alto risco: {late.mean():.1%} | semente: {SEED}")

if __name__ == "__main__":
    main()
