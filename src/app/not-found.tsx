import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#E8F0EA] border border-[#52715D]/20 flex items-center justify-center text-[#52715D] mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.5 9 8.5 9.8" />
          <path d="M12 2c5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10-1.5 0-3-.5-4-1" />
          <path d="M12 2v20" />
        </svg>
      </div>
      <h2 className="font-serif text-3xl text-[#171817] mb-2">Page Not Found</h2>
      <p className="text-sm text-[#555852] max-w-sm mb-6">
        The classroom or module you are looking for does not exist or has been relocated.
      </p>
      <Link href="/login">
        <Button className="rounded-xl bg-[#C85A43] hover:bg-[#A94734] text-white">
          Return to Portal
        </Button>
      </Link>
    </div>
  )
}
