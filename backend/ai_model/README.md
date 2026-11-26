# Previsão de atraso de devolução

Este módulo é uma demonstração acadêmica de classificação de risco com Random Forest.
A base é inteiramente sintética (8.000 exemplos, semente 42) e não representa histórico real.

## Treinar

Execute dentro de `backend`, com o ambiente virtual ativado:

```powershell
python ai_model/generate_dataset.py
python ai_model/train_model.py
```

O modelo é salvo em `ai_model/artifacts/risk_model.joblib`; as métricas são gravadas em
`ai_model/artifacts/metrics.json`. O alvo é ultrapassar 240 minutos (4 horas).

## API

Com o backend ativo e usuário autenticado:

- `GET /api/ai/status`
- `POST /api/ai/predict` com `{"key_id": 1, "person_id": 1}`

A API utiliza horário local do servidor quando `withdrawal_at` não é informado.
O modelo usa hora, dia da semana, identificador da chave e da pessoa. Os IDs são
características sintéticas, portanto a previsão é apenas ilustrativa até existir
histórico real, suficiente e validado.

## Limitações

As probabilidades refletem padrões inventados no gerador, não probabilidades calibradas
para uso real. Não usar para decisões operacionais. Para evoluir o recurso, coletar
ciclos reais completos de retirada/devolução, tratar dados pessoais, validar temporalmente
e reavaliar o modelo antes de qualquer uso prático.
