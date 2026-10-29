import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, ArrowLeft, ShieldCheck, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service | AI Tutor',
  description: 'Terms of Service and user agreement governing the AI Tutor Socratic learning platform.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#2D2A26] flex flex-col font-sans selection:bg-[#EAE4D9]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-[#E8E4DC] bg-[#FAF8F4]/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-full bg-[#1B3B2B] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-[#1B3B2B]">
              AI Tutor
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[#555852] hover:text-[#1B3B2B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-full bg-[#1B3B2B] text-white font-medium hover:bg-[#142D21] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="space-y-4 border-b border-[#E8E4DC] pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3EE] text-[#1B3B2B] text-xs font-mono font-medium border border-[#D1E3D8]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Legal Agreement</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B3B2B] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm font-mono text-[#78716C]">
            Last Updated &amp; Effective Date: October 29, 2026
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-[#4A4742]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              1. Acceptance of Terms &amp; Scope of Service
            </h2>
            <p>
              Welcome to <strong>AI Tutor</strong> (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              By registering an account, logging in via Google OAuth or email, or accessing any part of the service,
              you (&quot;User&quot; or &quot;Student&quot;) agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy.
            </p>
            <p>
              The Platform is exclusively designed for school education across <strong>Classes 6 to 12</strong> under
              recognized curricula including <strong>CBSE, ICSE, and IB</strong>. If you are under 18 years of age, you confirm that you have
              obtained parental or legal guardian consent to use this platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              2. Socratic Educational Cadence &amp; Digital Chalkboard
            </h2>
            <p>
              AI Tutor delivers real-time Socratic oral instruction paired with an interactive digital chalkboard. The tutor operates
              on a 6-stage pedagogical cadence: intuitive hook, scientific formulation, worked examples, step-by-step numerical derivations,
              understanding checks, and authentic board-exam practice questions.
            </p>
            <p>
              The live chalkboard acts as the primary source of truth for your learning sessions. All diagrams, mathematical graphs (rendered via vector math),
              and written proofs generated during your class are saved directly into your personal <strong>Master Notes</strong> archive for study and review.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              3. User Accounts &amp; Authentication
            </h2>
            <p>
              When creating an account through Google OAuth or passwordless email verification, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#57534E]">
              <li>Provide accurate, genuine information regarding your current academic grade (Classes 6–12) and target board.</li>
              <li>Maintain the confidentiality of your account authentication credentials.</li>
              <li>Notify us immediately of any unauthorized access or security breach regarding your account.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              4. Platform Prototype Status &amp; Usage Quotas
            </h2>
            <div className="p-4 rounded-2xl bg-[#F4EFE6] border border-[#E3DBD0] text-[#3D3A35] space-y-2">
              <p className="font-semibold text-[#1B3B2B]">
                Notice of Prototype Stage:
              </p>
              <p>
                The platform is currently operating in an active prototype and preview release. Usage allowances—including limits on
                the total number of AI voice requests or total topic capsules you can unlock—are managed by administrators.
              </p>
              <p className="font-mono text-xs text-[#5C564E]">
                We are still building this is just a prototype, for more limits contact{' '}
                <a
                  href="mailto:shauryaprabhakar097@gmail.com"
                  className="font-bold underline text-[#1B3B2B]"
                >
                  shauryaprabhakar097@gmail.com
                </a>.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              5. AI Voice &amp; Video Avatar Technology
            </h2>
            <p>
              AI Tutor leverages Google Gemini bidirectional streaming audio and Simli WebRTC facial rendering.
              When entering the digital classroom, you may interact using your microphone or text chat.
            </p>
            <p>
              Students whose accounts have avatar permissions enabled will see real-time lip-synced teacher animations.
              Accounts designated for audio-only mode will hear crystal-clear audio instruction and view live chalkboard notes without video avatar rendering.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              6. Academic Integrity &amp; Prohibited Conduct
            </h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#57534E]">
              <li>Use the platform for academic dishonesty, automated exam cheating, or plagiaristic misconduct.</li>
              <li>Attempt prompt injection, reverse engineering, unauthorized API scraping, or bypassing access control barriers.</li>
              <li>Submit harmful, profane, abusive, or sexually explicit prompts or media to the AI tutor.</li>
              <li>Interfere with, disrupt, or overburden our servers, WebRTC relays, or network infrastructure.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              7. Intellectual Property Rights
            </h2>
            <p>
              <strong>Your Master Notes:</strong> You retain full rights and ownership of your personal notes, annotations, and study session exports
              created on the digital chalkboard during your learning sessions.
            </p>
            <p>
              <strong>Platform IP:</strong> All software architecture, proprietary Socratic prompt systems, vector graphics engines, UI/UX designs,
              and mascot artwork remain the exclusive intellectual property of AI Tutor.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              8. Disclaimer of Warranties &amp; Educational Guarantee
            </h2>
            <p>
              The platform is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While our curriculum ingestion pipelines adhere
              strictly to official NCERT, CBSE, ICSE, and IB syllabi, AI Tutor is a supplemental pedagogical tool and does not guarantee specific
              school examination marks or academic rankings.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              9. Contact &amp; Inquiries
            </h2>
            <p>
              If you have any questions, feedback, or quota upgrade inquiries regarding these Terms, please contact our team directly:
            </p>
            <div className="p-4 rounded-xl bg-white border border-[#E8E4DC] flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#1B3B2B]" />
              <div>
                <p className="font-semibold text-xs text-[#1B3B2B]">Platform Administrator</p>
                <a
                  href="mailto:shauryaprabhakar097@gmail.com"
                  className="font-mono text-xs text-[#255D88] hover:underline"
                >
                  shauryaprabhakar097@gmail.com
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E8E4DC] bg-[#FAF8F4] py-8 text-center text-xs text-[#78716C]">
        <p>&copy; {new Date().getFullYear()} AI Tutor. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4 font-mono text-[11px]">
          <Link href="/privacy" className="hover:text-[#1B3B2B] underline">
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-[#1B3B2B] underline font-bold">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  )
}
