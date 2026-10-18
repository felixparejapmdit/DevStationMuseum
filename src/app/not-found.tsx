import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-xs tracking-[0.35em] text-magenta">404 · ROOM NOT FOUND</p>
        <h1 className="mt-3 font-display text-4xl font-bold">This gallery is closed.</h1>
        <p className="mt-3 text-muted">The work may have moved to another room.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="rounded-full bg-cyan px-5 py-2.5 text-sm font-semibold text-void">Enter the museum</Link>
          <Link href="/projects" className="rounded-full border border-line px-5 py-2.5 text-sm">Browse the collection</Link>
        </div>
      </div>
    </main>
  )
}
