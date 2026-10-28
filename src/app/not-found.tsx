import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--canvas-base)] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-sage-soft)] border border-[var(--accent-sage)]/20 flex items-center justify-center text-[var(--accent-sage)] mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.5 9 8.5 9.8" />
          <path d="M12 2c5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10-1.5 0-3-.5-4-1" />
          <path d="M12 2v20" />
        </svg>
      </div>
      <h2 className="font-serif text-3xl text-[var(--ink-primary)] mb-2">Page Not Found</h2>
      <p className="text-sm text-[var(--ink-secondary)] max-w-sm mb-6">
        The classroom or module you are looking for does not exist or has been relocated.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-xl bg-[var(--accent-warm)] hover:bg-[var(--accent-warm-hover)] text-white px-5 py-2.5 text-sm font-medium transition-colors"
      >
        Return to Portal
      </Link>
    </div>
  )
}
