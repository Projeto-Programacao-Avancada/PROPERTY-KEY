import { useEffect, useState } from 'react'
import { fetchAiStatus, predictWithdrawalRisk, type AiPrediction, type ApiKey, ApiError } from '../../lib/api'
import './ai.css'

export default function AiPage({ keys, previewMode }: { keys: ApiKey[]; previewMode: boolean }) {
  const [keyId, setKeyId] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [prediction, setPrediction] = useState<AiPrediction | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (previewMode) { setStatus('missing'); return }
    fetchAiStatus().then((result) => setStatus(result.available ? 'ready' : 'missing'))
      .catch(() => setStatus('error'))
  }, [previewMode])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!keyId) { setError('Selecione uma chave.'); return }
    setLoading(true); setError(''); setPrediction(null)
    try {
      setPrediction(await predictWithdrawalRisk(Number(keyId)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível gerar a previsão.')
    } finally { setLoading(false) }
  }

  return (
    <main className="ai-page">
      <header className="ai-heading">
        <span className="ai-eyebrow">INTELIGÊNCIA ARTIFICIAL</span>
        <h2>PREVISÃO DE ATRASO</h2>
        <p>Estime o risco de uma retirada ultrapassar o prazo de quatro horas.</p>
      </header>
      <section className="ai-panel">
        <div className="ai-panel-title"><span>◈</span><div><h3>ANÁLISE DE RISCO</h3><p>Modelo Random Forest · Limite de 4 horas</p></div></div>
        {previewMode && <p className="ai-warning">A previsão exige conexão com o backend e não está disponível no modo de prévia.</p>}
        {!previewMode && status === 'missing' && <p className="ai-warning">Modelo ainda não encontrado. Gere a base e treine o modelo no backend antes de consultar.</p>}
        {status === 'error' && <p className="ai-warning">Não foi possível verificar o modelo. Confira se o backend está ativo e entre novamente.</p>}
        <form className="ai-form" onSubmit={submit}>
          <label htmlFor="ai-key">CHAVE / IMÓVEL</label>
          <select id="ai-key" value={keyId} onChange={(e) => setKeyId(e.target.value)} required>
            <option value="">Selecione uma chave</option>
            {keys.filter((key) => key.status === 'available').map((key) => <option key={key.id} value={key.id}>{key.code} — {key.description}</option>)}
          </select>
          <button type="submit" disabled={loading || status !== 'ready' || previewMode}>{loading ? 'ANALISANDO...' : 'ANALISAR RISCO'}</button>
        </form>
        {error && <p className="ai-error" role="alert">{error}</p>}
        {prediction && (
          <section className={`ai-result ${prediction.risk}`} aria-live="polite">
            <span className="ai-result-label">RESULTADO DA ANÁLISE</span>
            <h3>{prediction.risk === 'high' ? 'ALTO RISCO DE ATRASO' : 'BAIXO RISCO DE ATRASO'}</h3>
            <strong>{prediction.probability_percent}%</strong>
            <p>Probabilidade estimada de ultrapassar {prediction.threshold_hours} horas.</p>
            <div className="ai-meter"><span style={{ width: `${prediction.probability_percent}%` }} /></div>
            <small>{prediction.disclaimer}</small>
          </section>
        )}
        <p className="ai-disclaimer">Demonstração acadêmica: o modelo foi treinado com dados sintéticos. As probabilidades não devem orientar decisões operacionais reais.</p>
      </section>
    </main>
  )
}
