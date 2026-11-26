from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..deps import get_current_user

router = APIRouter(prefix="/ai", tags=["inteligência artificial"], dependencies=[Depends(get_current_user)])
MODEL_PATH = Path(__file__).resolve().parents[2] / "ai_model" / "artifacts" / "risk_model.joblib"
_model = None

class PredictionIn(BaseModel):
    key_id: int = Field(ge=1)
    person_id: int = Field(default=1, ge=1)
    withdrawal_at: datetime | None = None

@router.get("/status")
def ai_status():
    return {"available": MODEL_PATH.exists(), "model": "RandomForestClassifier", "threshold_minutes": 240}

@router.post("/predict")
def predict(data: PredictionIn):
    global _model
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Modelo não treinado. Execute os scripts de geração e treinamento.")
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Não foi possível carregar o modelo de IA.") from exc
    moment = data.withdrawal_at or datetime.now()
    features = pd.DataFrame([{
        "hour": moment.hour,
        "weekday": moment.weekday(),
        "key_id": data.key_id,
        "person_id": data.person_id,
        "is_weekend": int(moment.weekday() >= 5),
    }])
    probability = float(_model.predict_proba(features)[0][1])
    return {
        "risk": "high" if probability >= 0.5 else "low",
        "probability": round(probability, 4),
        "probability_percent": round(probability * 100, 1),
        "threshold_minutes": 240,
        "threshold_hours": 4,
        "model": "Random Forest",
        "disclaimer": "Estimativa demonstrativa baseada em dados sintéticos; não representa desempenho validado em operações reais.",
    }
