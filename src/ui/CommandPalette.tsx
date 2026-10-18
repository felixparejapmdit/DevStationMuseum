'use client'
import { Command } from 'cmdk'
import { DoorOpen, House, LayoutGrid, Map as MapIcon, Route, Search, Sparkles, Volume2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { getMuseum, useMuseum } from '@/museum/store'
import { focusExhibit, goToEntrance, goToRoom, startTour, toggleMute } from '@/museum/actions'

function Item({ onSelect, value, children }: { onSelect: () => void; value: string; children: ReactNode }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/90 data-[selected=true]:bg-white/8 data-[selected=true]:text-ink"
    >
      {children}
    </Command.Item>
  )
}

const groupCls =
  'px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.25em] [&_[cmdk-group-heading]]:text-muted'

export function CommandPalette() {
  const open = useMuseum((s) => s.overlay === 'search')
  const rooms = useMuseum((s) => s.rooms)
  const layout = useMuseum((s) => s.layout)
  const router = useRouter()
  const close = () => getMuseum().set({ overlay: null })
  const run = (fn: () => void) => {
    close()
    fn()
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => getMuseum().set({ overlay: o ? 'search' : null })}
      label="Search the museum"
      filter={(value, search) => {
        // Every typed word must appear somewhere (title, tech, room): precise, not fuzzy.
        const v = value.toLowerCase()
        return search
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .every((w) => v.includes(w))
          ? 1
          : 0
      }}
      overlayClassName="fixed inset-0 z-50 bg-void/60 backdrop-blur-sm"
      contentClassName="glass fixed top-[12vh] left-1/2 z-50 w-[min(40rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={17} className="text-muted" aria-hidden />
        <Command.Input
          autoFocus
          placeholder="Search works, technologies or rooms…"
          className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
        />
        <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
      </div>
      <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto pb-2">
        <Command.Empty className="px-4 py-8 text-center text-sm text-muted">Nothing on display matches that.</Command.Empty>

        <Command.Group heading="WORKS" className={groupCls}>
          {rooms.flatMap((room) =>
            room.projects.map((p) => (
              <Item key={p.slug} value={`${p.title} ${p.tech.join(' ')} ${p.category} ${room.title}`} onSelect={() => run(() => void focusExhibit(p.slug))}>
                <span className="size-2 shrink-0 rounded-full" style={{ background: room.accent, boxShadow: `0 0 8px ${room.accent}` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{p.title}</span>
                  <span className="block truncate text-xs text-muted">{p.tech.slice(0, 4).join(' · ') || p.tagline}</span>
                </span>
                <span className="hidden shrink-0 text-xs text-muted sm:block">{room.title}</span>
              </Item>
            )),
          )}
        </Command.Group>

        <Command.Group heading="ROOMS" className={groupCls}>
          {layout?.rooms.map((r) => (
            <Item key={r.room.id} value={`room ${r.room.title} ${r.room.subtitle}`} onSelect={() => run(() => goToRoom(r.index))}>
              <DoorOpen size={16} style={{ color: r.room.accent }} aria-hidden />
              <span className="flex-1">{r.room.title}</span>
              <span className="font-mono text-xs text-muted">{r.exhibits.length} works</span>
            </Item>
          ))}
        </Command.Group>

        <Command.Group heading="ACTIONS" className={groupCls}>
          {layout?.featured && (
            <Item value="featured work" onSelect={() => run(() => void focusExhibit('featured'))}>
              <Sparkles size={16} className="text-amber" aria-hidden /> Featured work
            </Item>
          )}
          <Item value="guided tour start" onSelect={() => run(() => void startTour())}>
            <Route size={16} aria-hidden /> Start the guided tour
          </Item>
          <Item value="floor plan map" onSelect={() => getMuseum().set({ overlay: 'map' })}>
            <MapIcon size={16} aria-hidden /> Open the floor plan
          </Item>
          <Item value="entrance courtyard home" onSelect={() => run(goToEntrance)}>
            <House size={16} aria-hidden /> Return to the entrance
          </Item>
          <Item value="sound mute audio" onSelect={() => run(toggleMute)}>
            <Volume2 size={16} aria-hidden /> Toggle sound
          </Item>
          <Item value="2d list archive browse" onSelect={() => run(() => router.push('/projects'))}>
            <LayoutGrid size={16} aria-hidden /> Browse the collection in 2D
          </Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
