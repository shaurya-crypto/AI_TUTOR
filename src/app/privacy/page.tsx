import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, ArrowLeft, Lock, Mail, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | AI Tutor',
  description: 'Privacy Policy and data protection standards for the AI Tutor Socratic learning platform.',
}

export default function PrivacyPolicyPage() {
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
            <Lock className="w-3.5 h-3.5" />
            <span>Student Data Protection &amp; Privacy</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B3B2B] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm font-mono text-[#78716C]">
            Last Updated &amp; Effective Date: October 29, 2026
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-[#4A4742]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              1. Our Privacy Commitment
            </h2>
            <p>
              At <strong>AI Tutor</strong>, we believe educational technology must protect students first.
              This Privacy Policy explains how we collect, process, and safeguard information when you use our
              Socratic learning platform.
            </p>
            <p>
              We adhere strictly to the <strong>Digital Personal Data Protection (DPDP) Act</strong>, the <strong>Children&apos;s Online Privacy Protection Act (COPPA)</strong>,
              and global best practices. We strictly <strong>never sell student data, never display third-party advertisements, and never use student personal information for commercial marketing.</strong>
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              2. Information We Collect
            </h2>
            <p>We collect only the minimum information necessary to personalize Socratic tutoring sessions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DC] space-y-2">
                <h3 className="font-serif font-bold text-sm text-[#1B3B2B]">A. Account &amp; Google OAuth Data</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  When you sign in via Google OAuth, we receive your name, verified email address, and profile picture avatar.
                  This data is used solely to authenticate your session and personalize your student identity dossier.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DC] space-y-2">
                <h3 className="font-serif font-bold text-sm text-[#1B3B2B]">B. Academic Dossier</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  During onboarding, you specify your academic class (Classes 6–12), curriculum board (CBSE, ICSE, IB),
                  learning pace, and subject strengths/weaknesses. This context guides the AI tutor&apos;s Socratic cadence.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DC] space-y-2">
                <h3 className="font-serif font-bold text-sm text-[#1B3B2B]">C. Real-Time Classroom Audio &amp; Text</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  When you speak or type in the classroom, your input is streamed in real-time to Google Gemini Live API.
                  Audio streams are processed ephemerally to drive the conversation and are not retained as permanent biometric voiceprints.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DC] space-y-2">
                <h3 className="font-serif font-bold text-sm text-[#1B3B2B]">D. Chalkboard Master Notes</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  The structured topper notes, vector formulas, and worked examples written to the digital chalkboard
                  are securely saved to your private database profile in Supabase for revision and review.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              3. Google API Services User Data Policy Compliance
            </h2>
            <p>
              AI Tutor&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[#255D88] underline hover:text-[#1B3B2B]"
              >
                Google API Services User Data Policy
              </a>, including the Limited Use requirements.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#57534E]">
              <li>We request only basic user profile and email scopes for identity verification.</li>
              <li>We do not transfer your Google data to third parties other than necessary infrastructure providers.</li>
              <li>We do not use Google user data for serving advertisements or training generalized AI models.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              4. Third-Party Sub-Processors &amp; Infrastructure
            </h2>
            <p>
              We partner with enterprise-grade infrastructure providers under strict confidentiality and data protection agreements:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#57534E]">
              <li><strong>Supabase (PostgreSQL):</strong> Encrypted database hosting and user authentication with Row Level Security (RLS).</li>
              <li><strong>Google Gemini API:</strong> Socratic voice synthesis and curriculum decomposition via secure backend server endpoints.</li>
              <li><strong>Simli (WebRTC):</strong> Real-time facial avatar animation rendering for accounts with video avatars enabled.</li>
              <li><strong>Vercel &amp; Vercel Analytics:</strong> Web hosting, edge delivery, and privacy-friendly, anonymized performance analytics without cookies.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              5. Protection of Minor Students
            </h2>
            <p>
              Because our platform is designed for school students aged approximately 11 to 18 (Classes 6–12), we maintain
              heightened safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#57534E]">
              <li>Zero behavioral profiling or cross-site tracking.</li>
              <li>No public forums or unfiltered student-to-student messaging.</li>
              <li>Parents and guardians may review, request modifications to, or delete their child&apos;s learning history at any time.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              6. Your Data Rights &amp; Deletion
            </h2>
            <p>You have full ownership and control over your personal information:</p>
            <div className="p-4 rounded-2xl bg-[#F4EFE6] border border-[#E3DBD0] text-[#3D3A35] space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold text-xs text-[#1B3B2B]">
                  Right to Erasure &amp; Export:
                </span>
              </div>
              <p className="text-xs">
                To request permanent deletion of your account, learning history, and chalkboard notes, or to request a full export
                of your personal data, email our Data Protection Officer at:
              </p>
              <p className="font-mono text-xs font-bold text-[#1B3B2B]">
                <a href="mailto:shauryaprabhakar097@gmail.com" className="underline">
                  shauryaprabhakar097@gmail.com
                </a>
              </p>
              <p className="text-[11px] text-[#78716C]">
                All data deletion requests are verified and executed within 7 business days.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              7. Security Safeguards
            </h2>
            <p>
              We implement comprehensive security measures including end-to-end HTTPS/TLS encryption, PostgreSQL Row Level Security (RLS) policies,
              HMAC-signed session tokens, and automated rate-limiting guards against brute-force attacks.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#1B3B2B]">
              8. Contact &amp; Grievance Officer
            </h2>
            <p>
              For any privacy concerns, data inquiries, or regulatory compliance questions, please contact:
            </p>
            <div className="p-4 rounded-xl bg-white border border-[#E8E4DC] flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#1B3B2B]" />
              <div>
                <p className="font-semibold text-xs text-[#1B3B2B]">Shaurya Prabhakar</p>
                <p className="text-[11px] text-[#78716C]">Data Protection &amp; Grievance Lead</p>
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
          <Link href="/privacy" className="hover:text-[#1B3B2B] underline font-bold">
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-[#1B3B2B] underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  )
}
