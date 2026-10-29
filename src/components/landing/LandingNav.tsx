'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)

  // Hide navbar on scroll down, reveal on scroll up or near top (HeyAristotle motion pattern)
  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      if (mobileMenuOpen) return
      const currentScrollY = window.scrollY

      // Check whether user has scrolled past top stage
      setIsScrolled(currentScrollY > 20)

      if (currentScrollY > 40) {
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          // Scrolling down -> hide navbar
          setHidden(true)
        } else if (currentScrollY < lastScrollY - 4) {
          // Scrolling up -> reveal navbar
          setHidden(false)
        }
      } else {
        // At top -> always show navbar
        setHidden(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [mobileMenuOpen])

  // Check auth session for returning user experience
  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          setAuthenticatedUserId(data.user.id)
        }
      })
    } catch {
      // In offline/mock mode, ignore error
    }
  }, [])

  // Close mobile menu on Escape key and prevent background scroll when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <>
      {/* Hidden SVG Filter for Aristotle-style Dimensional Emboss / Deboss on Wordmark */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="aristotle-wordmark-filter" x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.25" result="cast-blur" />
            <feOffset in="cast-blur" dy="0.6" result="cast-offset" />
            <feFlood floodColor="rgba(23, 24, 23, 0.16)" result="cast-color" />
            <feComposite in="cast-color" in2="cast-offset" operator="in" result="cast-shadow" />
            <feOffset in="SourceAlpha" dy="0.35" result="alpha-down" />
            <feComposite in="SourceAlpha" in2="alpha-down" operator="out" result="top-edge" />
            <feGaussianBlur in="top-edge" stdDeviation="0.1" result="top-edge-soft" />
            <feFlood floodColor="rgba(255, 255, 255, 0.85)" result="highlight-color" />
            <feComposite in="highlight-color" in2="top-edge-soft" operator="in" result="top-highlight" />
            <feMerge>
              <feMergeNode in="cast-shadow" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="top-highlight" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* HeyAristotle Fixed Edge-to-Edge Navigation Header with Liquid Glass */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 sm:h-[72px] transition-all duration-350 ease-smooth ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${isScrolled ? 'liquid-glass-active' : 'liquid-glass-top'}`}
      >
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 h-full flex items-center justify-between">
          {/* Brand - Prestigious Instrument Serif Dimensional Wordmark */}
          <Link
            href="/"
            className="group flex items-center gap-2 transition-opacity hover:opacity-85 select-none"
            aria-label="AI Tutor home"
          >
            <span
              className="font-serif text-[24px] sm:text-[27px] tracking-[-0.015em] text-ink-primary font-normal leading-none"
              style={{ filter: 'url(#aristotle-wordmark-filter)' }}
            >
              AI Tutor
            </span>
          </Link>

          {/* Desktop Navigation Links - Geist High-Precision Typography matching HeyAristotle */}
          <nav
            className="hidden md:flex items-center gap-7 lg:gap-8 text-[13.5px] font-semibold text-ink-secondary tracking-[-0.01em]"
            aria-label="Primary navigation"
          >
            <a
              href="#what-it-is"
              className="transition-colors duration-200 hover:text-ink-primary"
            >
              What It Is
            </a>
            <a
              href="#experience"
              className="transition-colors duration-200 hover:text-ink-primary"
            >
              Why It Works
            </a>
            <a
              href="#flow"
              className="transition-colors duration-200 hover:text-ink-primary"
            >
              The Progression
            </a>
            {!authenticatedUserId && (
              <Link
                href="/login"
                className="transition-colors duration-200 hover:text-ink-primary"
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Action CTAs & Mobile Menu */}
          <div className="flex items-center gap-3">
            {authenticatedUserId ? (
              <Link
                href={`/dashboard/${authenticatedUserId}`}
                className="btn-aristotle-primary group inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs sm:text-[13px] font-semibold text-white tracking-tight"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <Link
                href="/onboarding"
                className="btn-aristotle-primary group inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs sm:text-[13px] font-semibold text-white tracking-tight"
              >
                <span>Sign up</span>
                <ArrowRight className="h-3.5 w-3.5 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            )}

            {/* Mobile Menu Ghost Pill Trigger (HeyAristotle style) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label="Open Navigation Menu"
              className="flex md:hidden items-center justify-center rounded-full border border-black/[0.08] bg-white/70 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-ink-primary shadow-xs transition-all hover:bg-white active:scale-95"
            >
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* HeyAristotle Mobile Full-Screen Dialog with Staggered Entrance Animation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col backdrop-blur-2xl bg-[var(--canvas-base)]/95 transition-opacity duration-300 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Primary mobile navigation"
        >
          {/* Mobile Top Bar */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-black/[0.06]">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="font-serif text-[24px] tracking-tight text-ink-primary font-normal"
              style={{ filter: 'url(#aristotle-wordmark-filter)' }}
            >
              AI Tutor
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close Navigation Menu"
              className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink-primary shadow-xs transition-all hover:bg-white active:scale-95"
            >
              <span>Close</span>
              <X className="h-3.5 w-3.5 text-ink-primary" />
            </button>
          </div>

          {/* Mobile Nav Links with Aristotle Staggered Fade */}
          <nav className="flex-1 flex flex-col justify-start px-8 pt-8 pb-10 gap-4 overflow-y-auto">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-1">
              Classroom Navigation
            </span>

            <a
              href="#what-it-is"
              onClick={() => setMobileMenuOpen(false)}
              style={{ animationDelay: '80ms' }}
              className="animate-aristotle-link text-xl font-medium text-ink-primary hover:text-coral-primary transition-colors py-1.5"
            >
              What It Is
            </a>
            <a
              href="#experience"
              onClick={() => setMobileMenuOpen(false)}
              style={{ animationDelay: '140ms' }}
              className="animate-aristotle-link text-xl font-medium text-ink-primary hover:text-coral-primary transition-colors py-1.5"
            >
              Why It Works
            </a>
            <a
              href="#flow"
              onClick={() => setMobileMenuOpen(false)}
              style={{ animationDelay: '200ms' }}
              className="animate-aristotle-link text-xl font-medium text-ink-primary hover:text-coral-primary transition-colors py-1.5"
            >
              The Progression
            </a>

            <div
              style={{ animationDelay: '260ms' }}
              className="animate-aristotle-link my-3 border-t border-black/[0.06] pt-5 flex flex-col gap-3"
            >
              {authenticatedUserId ? (
                <Link
                  href={`/dashboard/${authenticatedUserId}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-aristotle-primary flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-xs"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-full border border-black/[0.1] bg-white py-2.5 text-sm font-medium text-ink-primary hover:bg-surface-soft transition-colors"
                  >
                    Sign in to Account
                  </Link>
                  <Link
                    href="/onboarding"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-aristotle-primary flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-xs"
                  >
                    <span>Sign up</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
