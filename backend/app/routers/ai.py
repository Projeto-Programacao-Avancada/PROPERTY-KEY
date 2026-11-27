from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from ..deps import get_current_user
from ..schemas import AiPredictionIn, AiPredictionOut, AiStatusOut

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    dependencies=[Depends(get_current_user)],
)
MODEL_PATH = Path(__file__).resolve().parents[2] / "ai_model" / "artifacts" / "risk_model.joblib"
_model = None


@router.get("/status", response_model=AiStatusOut)
def ai_status():
    return AiStatusOut(
        available=MODEL_PATH.exists(),
        model="RandomForestClassifier",
        threshold_minutes=240,
    )


@router.post("/predict", response_model=AiPredictionOut)
def predict(data: AiPredictionIn):
    global _model
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Modelo não treinado. Execute os scripts de geração e treinamento.",
        )
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail="Não foi possível carregar o modelo de IA.",
            ) from exc
    moment = data.withdrawal_at or datetime.now()
    features = pd.DataFrame([{
        "hour": moment.hour,
        "weekday": moment.weekday(),
        "key_id": data.key_id,
        "person_id": data.person_id,
        "is_weekend": int(moment.weekday() >= 5),
    }])
    probability = float(_model.predict_proba(features)[0][1])
    return AiPredictionOut(
        risk="high" if probability >= 0.5 else "low",
        probability=round(probability, 4),
        probability_percent=round(probability * 100, 1),
        threshold_minutes=240,
        threshold_hours=4,
        model="Random Forest",
        disclaimer="Estimativa demonstrativa baseada em dados sintéticos; não representa desempenho validado em operações reais.",
    )
