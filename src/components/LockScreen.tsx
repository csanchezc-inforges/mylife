import { useState } from 'react'
import { authenticateBiometric, setUnlocked } from '../lib/biometric'

interface Props {
  onUnlock: () => void
  onDisableBiometric?: () => void
}

export function LockScreen({ onUnlock, onDisableBiometric }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnlock = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await authenticateBiometric()
      if (result.ok) {
        setUnlocked(true)
        onUnlock()
      } else {
        setError(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen-content">
        <div className="lock-screen-icon" aria-hidden>🔐</div>
        <h1 className="lock-screen-title">MyLife</h1>
        <p className="lock-screen-sub">Toca para desbloquear con tu huella</p>
        <button
          type="button"
          className="btn btn-primary lock-screen-btn"
          onClick={handleUnlock}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18 }} />
              Comprobando…
            </>
          ) : (
            '🔒 Desbloquear con huella'
          )}
        </button>
        {error && (
          <p className="lock-screen-error" role="alert">
            {error}
          </p>
        )}
        {onDisableBiometric && (
          <button
            type="button"
            className="btn btn-ghost lock-screen-disable"
            onClick={onDisableBiometric}
          >
            Desactivar desbloqueo con huella
          </button>
        )}
      </div>
    </div>
  )
}
