"""Treina e avalia classificador de risco de atraso."""
from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "synthetic_withdrawals.csv"
MODEL = ROOT / "artifacts" / "risk_model.joblib"
FEATURES = ["hour", "weekday", "key_id", "person_id", "is_weekend"]

def metrics(y_true, y_pred):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }

def main():
    data = pd.read_csv(DATA)
    X, y = data[FEATURES], data["late"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    model = RandomForestClassifier(
        n_estimators=250, max_depth=12, min_samples_leaf=3,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)
    result = {
        "model_metrics": metrics(y_test, model.predict(X_test)),
        "baseline_metrics": metrics(y_test, [0] * len(y_test)),
        "features": FEATURES,
        "threshold_minutes": 240,
        "dataset": "synthetic_withdrawals.csv",
    }
    MODEL.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL)
    (ROOT / "artifacts" / "metrics.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"Modelo salvo em: {MODEL}")

if __name__ == "__main__":
    main()
