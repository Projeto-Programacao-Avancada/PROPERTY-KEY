import { useEffect, useState } from 'react'

// Data atual que se renova sozinha, para durações "em posse" atualizarem em tempo real.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
