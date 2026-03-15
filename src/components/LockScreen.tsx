import { useState } from 'react'
import { authenticateBiometric, setUnlocked } from '../lib/biometric'
import appLogo from '../assets/icon-192.png'

const UNLOCK_PIN = '9974'

interface Props {
  onUnlock: () => void
  onDisableBiometric?: () => void
}

export function LockScreen({ onUnlock, onDisableBiometric }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  const handleBiometric = async () => {
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

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setPinError(null)
    if (next.length === 4 && next === UNLOCK_PIN) {
      setUnlocked(true)
      onUnlock()
    } else if (next.length === 4) {
      setPinError('PIN incorrecto')
      setTimeout(() => setPin(''), 600)
    }
  }

  const handlePinBack = () => setPin(p => p.slice(0, -1))

  return (
    <div className="lock-screen">
      <div className="lock-screen-bg" aria-hidden />
      <div className="lock-screen-card">
        <div className="lock-screen-logo-wrap">
          <img src={appLogo} alt="" className="lock-screen-logo" width={96} height={96} />
        </div>
        <h1 className="lock-screen-title">MyLife</h1>
        <p className="lock-screen-sub">Desbloquea para continuar</p>

        {!showPin ? (
          <>
            <button
              type="button"
              className="btn btn-primary lock-screen-btn lock-screen-btn-main"
              onClick={handleBiometric}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 20, height: 20 }} />
                  Comprobando…
                </>
              ) : (
                <>
                  <span className="lock-screen-btn-icon">👆</span>
                  Desbloquear con huella
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost lock-screen-btn"
              onClick={() => { setShowPin(true); setError(null); setPinError(null); setPin('') }}
            >
              Usar PIN
            </button>
            {error && <p className="lock-screen-error" role="alert">{error}</p>}
            {onDisableBiometric && (
              <button type="button" className="lock-screen-disable" onClick={onDisableBiometric}>
                Desactivar desbloqueo con huella
              </button>
            )}
          </>
        ) : (
          <div className="lock-screen-pin">
            <div className="lock-screen-pin-dots">
              {[0, 1, 2, 3].map(i => (
                <span key={i} className={`lock-screen-dot${i < pin.length ? ' filled' : ''}`} />
              ))}
            </div>
            {pinError && <p className="lock-screen-error" role="alert">{pinError}</p>}
            <div className="lock-screen-numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(key =>
                key === '' ? (
                  <span key="empty" className="lock-screen-numpad-key lock-screen-numpad-empty" />
                ) : key === '⌫' ? (
                  <button type="button" key="back" className="lock-screen-numpad-key" onClick={handlePinBack} aria-label="Borrar">
                    ⌫
                  </button>
                ) : (
                  <button type="button" key={key} className="lock-screen-numpad-key" onClick={() => handlePinDigit(key)}>
                    {key}
                  </button>
                )
              )}
            </div>
            <button type="button" className="btn btn-ghost lock-screen-back" onClick={() => { setShowPin(false); setPin(''); setPinError(null) }}>
              ← Volver a huella
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
