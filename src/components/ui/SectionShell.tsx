import type { ReactNode } from 'react'
import './SectionShell.css'

type SectionShellProps = {
  id?: string
  children: ReactNode
}

export function SectionShell({ id, children }: SectionShellProps) {
  return (
    <section id={id} className="section-shell">
      {children}
    </section>
  )
}