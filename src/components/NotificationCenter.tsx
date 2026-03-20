import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'

function levelClass(level: 'info' | 'success' | 'warning') {
  if (level === 'success') {
    return 'border-l-4 border-l-neutral-900'
  }
  if (level === 'warning') {
    return 'border-l-4 border-l-neutral-500'
  }
  return 'border-l-4 border-l-neutral-300'
}

export function NotificationCenter() {
  const { state, dismissNotification } = useAppContext()
  const items = state.notifications.slice(0, 3)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, { fade: ReturnType<typeof setTimeout>; remove: ReturnType<typeof setTimeout> }>>(new Map())

  const clearTimers = useCallback((id: string) => {
    const timers = timersRef.current.get(id)
    if (!timers) {
      return
    }

    clearTimeout(timers.fade)
    clearTimeout(timers.remove)
    timersRef.current.delete(id)
  }, [])

  const closeNotification = useCallback((id: string) => {
    clearTimers(id)
    setFadingIds((prev) => {
      if (!prev.has(id)) {
        return prev
      }

      const next = new Set(prev)
      next.delete(id)
      return next
    })
    dismissNotification(id)
  }, [clearTimers, dismissNotification])

  const startAutoDismiss = useCallback((id: string) => {
    if (timersRef.current.has(id)) {
      return
    }

    const fade = setTimeout(() => {
      setFadingIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }, 4500)

    const remove = setTimeout(() => {
      closeNotification(id)
    }, 5000)

    timersRef.current.set(id, { fade, remove })
  }, [closeNotification])

  useEffect(() => {
    items.forEach((item) => {
      startAutoDismiss(item.id)
    })

    const currentIds = new Set(items.map((item) => item.id))
    timersRef.current.forEach((_timers, id) => {
      if (!currentIds.has(id)) {
        clearTimers(id)
        setFadingIds((prev) => {
          if (!prev.has(id)) {
            return prev
          }

          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    })
  }, [items, startAutoDismiss, clearTimers])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timers) => {
        clearTimeout(timers.fade)
        clearTimeout(timers.remove)
      })
      timersRef.current.clear()
    }
  }, [])

  if (items.length === 0) {
    return null
  }

  return (
    <div className="fixed right-4 top-20 z-40 flex w-[min(92vw,24rem)] flex-col gap-2 md:right-8">
      {items.map((item) => (
        <article
          key={item.id}
          className={`rounded-2xl bg-white p-4 shadow-[0_18px_45px_rgba(0,0,0,0.1)] transition-opacity duration-500 ${levelClass(item.level)} ${fadingIds.has(item.id) ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed text-neutral-700">{item.message}</p>
            <button
              type="button"
              onClick={() => closeNotification(item.id)}
              className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}