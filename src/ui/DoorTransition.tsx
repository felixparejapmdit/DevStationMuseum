'use client'
import { useMuseum } from '@/museum/store'

/** Two neon-edged doors that slide shut while the visitor is moved, then open again. */
export function DoorTransition() {
  const phase = useMuseum((s) => s.transition)
  const label = useMuseum((s) => s.transitionLabel)
  const closed = phase === 'closing'
  const ease = 'transition-transform duration-[380ms] ease-[cubic-bezier(.7,0,.3,1)]'
  return (
    <div className={`absolute inset-0 z-[60] overflow-hidden ${phase === 'idle' ? 'pointer-events-none' : ''}`} aria-hidden={phase === 'idle'}>
      <div
        className={`absolute inset-y-0 left-0 w-[50.5%] border-r-2 border-primary bg-gradient-to-r from-panel to-panel-2 shadow-[4px_0_30px_rgb(var(--primary-rgb)/0.5)] ${ease} ${closed ? 'translate-x-0' : '-translate-x-[105%]'}`}
      />
      <div
        className={`absolute inset-y-0 right-0 w-[50.5%] border-l-2 border-secondary bg-gradient-to-l from-panel to-panel-2 shadow-[-4px_0_30px_rgb(var(--secondary-rgb)/0.5)] ${ease} ${closed ? 'translate-x-0' : 'translate-x-[105%]'}`}
      />
      {closed && label && (
        <p role="status" className="absolute inset-0 grid place-items-center font-mono text-xs tracking-[0.35em] text-ink">
          {label.toUpperCase()}
        </p>
      )}
    </div>
  )
}
