'use client'
import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { useMuseum } from '@/museum/store'
import { pauseTour, skipTour, stopTour } from '@/museum/actions'

export function TourBar() {
  const tour = useMuseum((s) => s.tour)
  const total = useMuseum((s) => s.tourSteps.filter((t) => t.kind === 'focus').length)
  const steps = useMuseum((s) => s.tourSteps)
  const done = steps.slice(0, tour.index).filter((t) => t.kind === 'focus').length
  const btn = 'grid size-9 place-items-center rounded-full text-ink hover:bg-ink/10'
  return (
    <AnimatePresence>
      {tour.active && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="glass absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full py-1.5 pr-1.5 pl-4 sm:bottom-6"
          role="region"
          aria-label="Guided tour controls"
        >
          <div className="mr-2 min-w-0">
            <p className="font-mono text-[9px] tracking-[0.3em] text-secondary">GUIDED TOUR · {done}/{total}</p>
            <p className="max-w-[11rem] truncate text-sm text-ink sm:max-w-[16rem]">{tour.paused ? 'Paused, explore freely' : tour.label || 'On the move…'}</p>
          </div>
          <button type="button" className={btn} onClick={() => void skipTour(-1)} aria-label="Previous stop">
            <SkipBack size={16} />
          </button>
          <button type="button" className={btn} onClick={() => pauseTour(!tour.paused)} aria-label={tour.paused ? 'Resume tour' : 'Pause tour'}>
            {tour.paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button type="button" className={btn} onClick={() => void skipTour(1)} aria-label="Next stop">
            <SkipForward size={16} />
          </button>
          <button type="button" className={btn} onClick={stopTour} aria-label="End tour">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
