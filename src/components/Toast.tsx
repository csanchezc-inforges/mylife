import { useEffect, useState } from 'react'

let toastTimeout: ReturnType<typeof setTimeout>
let setGlobalMsg: ((msg: string) => void) | null = null

export function toast(msg: string) {
  setGlobalMsg?.(msg)
}

export function Toast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setGlobalMsg = (m: string) => {
      setMsg(m)
      setVisible(true)
      clearTimeout(toastTimeout)
      toastTimeout = setTimeout(() => setVisible(false), 2800)
    }
    return () => { setGlobalMsg = null }
  }, [])

  return <div className={`toast${visible ? ' show' : ''}`}>{msg}</div>
}
