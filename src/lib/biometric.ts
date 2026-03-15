/**
 * Autenticación con huella (WebAuthn / sensor biométrico).
 * Opcional: se activa en Config y obliga a desbloquear con huella al abrir la app.
 */

const BIOMETRIC_CREDENTIAL_KEY = 'mylife_biometric_credential_id'
const BIOMETRIC_UNLOCK_KEY = 'mylife_biometric_unlocked'

function getRpId(): string {
  if (typeof window === 'undefined') return 'localhost'
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' ? 'localhost' : host
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBuffer(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function isBiometricSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function'
}

/** Registrar credencial biométrica (al activar la opción en Config). */
export async function registerBiometric(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isBiometricSupported()) {
    return { ok: false, error: 'Tu navegador o dispositivo no soporta desbloqueo con huella.' }
  }
  try {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const rpId = getRpId()
    const userId = new Uint8Array(16)
    crypto.getRandomValues(userId)
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: { name: 'MyLife', id: rpId },
        user: {
          id: userId,
          name: 'mylife@local',
          displayName: 'MyLife',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    }
    const credential = (await navigator.credentials.create(options)) as PublicKeyCredential | null
    if (!credential) {
      return { ok: false, error: 'No se creó la credencial. Prueba de nuevo.' }
    }
    const id = (credential as PublicKeyCredential).rawId
    const idStr = bufferToBase64url(id)
    try {
      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, idStr)
    } catch {
      return { ok: false, error: 'No se pudo guardar la credencial.' }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('cancel') || msg.includes('NotAllowed')) {
      return { ok: false, error: 'Registro cancelado.' }
    }
    return { ok: false, error: msg || 'Error al registrar la huella.' }
  }
}

/** Verificar huella para desbloquear. */
export async function authenticateBiometric(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isBiometricSupported()) {
    return { ok: false, error: 'No soportado.' }
  }
  const idStr = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY)
  if (!idStr) {
    return { ok: false, error: 'No hay credencial. Activa de nuevo la huella en Config.' }
  }
  try {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const credentialId = base64urlToBuffer(idStr)
    const options: CredentialRequestOptions = {
      publicKey: {
        challenge,
        rpId: getRpId(),
        allowCredentials: [{ type: 'public-key', id: credentialId }],
        userVerification: 'required',
        timeout: 60000,
      },
    }
    const credential = (await navigator.credentials.get(options)) as PublicKeyCredential | null
    if (!credential) {
      return { ok: false, error: 'Verificación cancelada.' }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('cancel') || msg.includes('NotAllowed')) {
      return { ok: false, error: 'Acceso denegado.' }
    }
    return { ok: false, error: msg || 'Error al verificar.' }
  }
}

export function setUnlocked(value: boolean): void {
  try {
    if (value) sessionStorage.setItem(BIOMETRIC_UNLOCK_KEY, '1')
    else sessionStorage.removeItem(BIOMETRIC_UNLOCK_KEY)
  } catch {}
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(BIOMETRIC_UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

/** Al desactivar huella en Config, borrar credencial guardada. */
export function clearBiometricCredential(): void {
  try {
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY)
    sessionStorage.removeItem(BIOMETRIC_UNLOCK_KEY)
  } catch {}
}
