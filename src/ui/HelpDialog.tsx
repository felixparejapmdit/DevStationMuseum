'use client'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { getMuseum, useMuseum } from '@/museum/store'

const ROWS: [string, string][] = [
  ['Click / tap the floor', 'Glide there'],
  ['Drag', 'Look around'],
  ['W A S D  or  arrows', 'Walk (Shift to run, Q / E to turn)'],
  ['Click a work or its floor ring', 'Step up and read about it'],
  ['← →  while viewing', 'Previous / next work'],
  ['Tab  (view focused)', 'Cycle through works'],
  ['M', 'Floor plan'],
  ['Ctrl / ⌘ K  or  /', 'Search works & rooms'],
  ['T', 'Start / stop the guided tour'],
  ['N', 'Mute / unmute'],
  ['L', 'Daylight / night mode'],
  ['Esc', 'Close / step back'],
]

export function HelpDialog() {
  const open = useMuseum((s) => s.overlay === 'help')
  const close = () => getMuseum().set({ overlay: null })
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 grid place-items-center bg-void/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
        >
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            className="glass w-full max-w-lg rounded-3xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] text-primary">HOW TO VISIT</p>
                <h2 id="help-title" className="mt-1 font-display text-2xl font-semibold">Explore at your own pace</h2>
              </div>
              <button type="button" onClick={close} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close help">
                <X size={18} />
              </button>
            </div>
            <dl className="mt-5 divide-y divide-line text-sm">
              {ROWS.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2">
                  <dt className="font-mono text-xs text-ink">{k}</dt>
                  <dd className="text-right text-muted">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Lights switch on as you enter each room. Rooms hold up to five works and new rooms open along the Grand Gallery as the
              collection grows. Prefer a list? The 2D view has every work, and every page has a shareable link.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
