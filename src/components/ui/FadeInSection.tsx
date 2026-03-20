import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import './FadeInSection.css'

type FadeInSectionProps = {
  children: ReactNode
  className?: string
}

export function FadeInSection({ children, className = '' }: FadeInSectionProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className={`fade-section ${visible ? 'fade-section-visible' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}