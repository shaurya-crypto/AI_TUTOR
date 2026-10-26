import React, { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/SettingsView'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== resolvedParams.id) {
    redirect('/login')
  }

  // Fetch student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center font-serif text-[#555852]">Loading settings...</div>}>
      <SettingsView
        user={{ id: user.id, email: user.email }}
        profile={profile || {}}
      />
    </Suspense>
  )
}
