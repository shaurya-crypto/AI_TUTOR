'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Settings as SettingsIcon,
  BookOpen,
  Sparkles,
  Check,
  RotateCcw,
  LogOut,
  ArrowLeft,
  Shield,
  HelpCircle,
} from 'lucide-react'
import {
  updateAccountAction,
  updateTeachingStyleAction,
  updateGeneralSettingsAction,
  updatePasswordAction,
  updateAvatarPreferenceAction,
  signOutAction,
} from '@/app/dashboard/actions'
import { VOICE_OPTIONS } from '@/lib/voiceAndLanguageConfig'

export interface PrebuiltAvatar {
  id: string
  name: string
  title: string
  subject: string
  description: string
  image: string
  badge: string
  recommendedBoard: string
  engine: string
}

export const PREBUILT_AVATARS: PrebuiltAvatar[] = [
  {
    id: '80459b57-2d66-4ca7-8682-59e1c649bc53',
    name: 'Prof. Vikram Raman',
    title: 'Senior Academician & Physics Specialist',
    subject: 'Physics, Mechanics & Advanced Numericals',
    description:
      'Rigorous 6-stage Socratic problem solving, comprehensive board numerical breakdowns (Given -> Formula -> Substitution -> Boxed Answer), and clear physical intuition.',
    image: '/avatars/80459b57-2d66-4ca7-8682-59e1c649bc53.jpg',
    badge: 'Primary Default',
    recommendedBoard: 'CBSE & ICSE Classes 9-12',
    engine: 'Simli Ultra-Fast WebRTC',
  },
  {
    id: 'a6d08e06-038a-4b32-84ae-b02e0f0f1140',
    name: 'Prof. Marcus Chen',
    title: 'Senior Mathematics & Applied Science Fellow',
    subject: 'Mathematics, Coordinate Geometry & Calculus',
    description:
      'First-principles proofs, geometric interpretation of limits and derivatives, trigonometric identities, and algebraic symmetry.',
    image: '/avatars/a6d08e06-038a-4b32-84ae-b02e0f0f1140.jpg',
    badge: 'Available Free',
    recommendedBoard: 'CBSE & IB Mathematics',
    engine: 'Simli Ultra-Fast WebRTC',
  },
  {
    id: '20cfe7d7-cfd7-43ee-9301-72a7c7056eaf',
    name: 'Dr. Elena Rostova',
    title: 'Atomic Chemistry & Thermodynamics Fellow',
    subject: 'Chemistry, Stoichiometry & Chemical Bonding',
    description:
      'Deep experimental intuition, precise definitions of chemical phenomena, stoichiometry, reaction mechanisms, and foundational atomic theory.',
    image: '/avatars/20cfe7d7-cfd7-43ee-9301-72a7c7056eaf.jpg',
    badge: 'Available Free',
    recommendedBoard: 'ICSE & IB Chemistry',
    engine: 'Simli Ultra-Fast WebRTC',
  },
  {
    id: 'd9c96b08-b2ca-48ef-b458-5c4471d9fe09',
    name: 'Prof. Sarah Jenkins',
    title: 'Life Sciences & Cellular Biology Mentor',
    subject: 'Biology, Physiological Cycles & Biochemistry',
    description:
      'Dynamic physical visualization of biological cycles, genetics, cellular respiration, and organ system interaction with clinical precision.',
    image: '/avatars/d9c96b08-b2ca-48ef-b458-5c4471d9fe09.jpg',
    badge: 'Available Free',
    recommendedBoard: 'CBSE & ICSE Classes 9-12',
    engine: 'Simli Ultra-Fast WebRTC',
  },
]



export const BOARD_OPTIONS = [
  {
    id: 'CBSE',
    name: 'CBSE (Central Board of Secondary Education)',
    desc: 'NCERT standard, step-by-step derivations, 50% NEP-2020 competency questions, no calculators.',
  },
  {
    id: 'ICSE',
    name: 'ICSE / ISC (Council for the Indian School Certificate)',
    desc: 'Verbatim textbook definitions, dual-column rough work margin, Selina Concise & Morning Star alignment.',
  },
  {
    id: 'IB',
    name: 'IB (International Baccalaureate MYP & DP)',
    desc: 'Statement of Inquiry (SOI), official IB command terms, measurement uncertainty, formula booklet HUD.',
  },
]

export const CLASS_LEVEL_OPTIONS = [
  { id: 'class_6', label: 'Class 6' },
  { id: 'class_7', label: 'Class 7' },
  { id: 'class_8', label: 'Class 8' },
  { id: 'class_9', label: 'Class 9' },
  { id: 'class_10', label: 'Class 10' },
  { id: 'class_11', label: 'Class 11' },
  { id: 'class_12', label: 'Class 12' },
]

interface SettingsViewProps {
  user: {
    id: string
    email?: string
  }
  profile: any
}

type TabType = 'avatars' | 'account' | 'general' | 'teaching'

export function SettingsView({ user, profile }: SettingsViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabType) || 'avatars'

  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Avatar state
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    profile?.selected_avatar_id || '80459b57-2d66-4ca7-8682-59e1c649bc53'
  )
  const [avatarSaveMessage, setAvatarSaveMessage] = useState<string | null>(null)

  // Account state
  const [fullName, setFullName] = useState<string>(profile?.full_name || '')
  const [classLevel, setClassLevel] = useState<string>(profile?.class_level || 'class_10')
  const [targetBoard, setTargetBoard] = useState<string>(profile?.target_board || 'CBSE')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountStatus, setAccountStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // General state
  const [preferredVoice, setPreferredVoice] = useState<string>(profile?.preferred_teacher_voice || 'Leda')
  const [speechRate, setSpeechRate] = useState<string>('1.0')
  const [autoListen, setAutoListen] = useState<boolean>(true)
  const [generalStatus, setGeneralStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

  // Teaching style state
  const [learningStyle, setLearningStyle] = useState<string>(profile?.learning_style || 'socratic')
  const [preferredPacing, setPreferredPacing] = useState<string>(profile?.preferred_pacing || 'normal')
  const [noteDensity, setNoteDensity] = useState<string>('topper_detailed')
  const [teachingStatus, setTeachingStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSavingTeaching, setIsSavingTeaching] = useState(false)

  // Load client-side stored avatar on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedFaceId = localStorage.getItem('ai_tutor_selected_face_id')
        if (storedFaceId && storedFaceId.length > 5) {
          setSelectedAvatarId(storedFaceId)
        }
      } catch {}
    }
  }, [])

  // Sync tab with URL parameter if it changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType
    if (tabParam && ['avatars', 'account', 'general', 'teaching'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Change active tab
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    router.replace(`/dashboard/${user.id}/settings?tab=${tab}`)
  }

  // Handle prebuilt avatar selection
  const handleSelectAvatar = async (avatar: PrebuiltAvatar) => {
    setSelectedAvatarId(avatar.id)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai_tutor_selected_face_id', avatar.id)
        localStorage.setItem('ai_tutor_avatar_preview', avatar.image)
        localStorage.removeItem('ai_tutor_avatar_config')
      } catch {}
    }

    setAvatarSaveMessage(`Applied ${avatar.name} (${avatar.id}) as active classroom avatar.`)
    setTimeout(() => setAvatarSaveMessage(null), 4000)

    try {
      await updateAvatarPreferenceAction({
        avatarId: avatar.id,
        avatarUrl: avatar.image,
      })
    } catch (e) {
      console.warn('[Settings] Failed to save avatar preference to server:', e)
    }
  }

  // Reset to default prebuilt avatar
  const handleResetToDefault = async () => {
    const defaultAvatar = PREBUILT_AVATARS[0]
    await handleSelectAvatar(defaultAvatar)
  }

  // Handle Account Update
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingAccount(true)
    setAccountStatus(null)

    const res = await updateAccountAction({
      fullName,
      classLevel,
      targetBoard,
    })

    setIsUpdatingAccount(false)
    if (res.error) {
      setAccountStatus({ type: 'error', message: res.error })
    } else {
      setAccountStatus({ type: 'success', message: 'Account details updated successfully.' })
      setTimeout(() => setAccountStatus(null), 4000)
    }
  }

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setAccountStatus({ type: 'error', message: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setAccountStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }

    setIsUpdatingPassword(true)
    setAccountStatus(null)

    const res = await updatePasswordAction({ newPassword })

    setIsUpdatingPassword(false)
    if (res.error) {
      setAccountStatus({ type: 'error', message: res.error })
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setAccountStatus({ type: 'success', message: 'Password changed successfully.' })
      setTimeout(() => setAccountStatus(null), 4000)
    }
  }

  // Handle General Settings Update
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingGeneral(true)
    setGeneralStatus(null)

    const res = await updateGeneralSettingsAction({
      preferredTeacherVoice: preferredVoice,
    })

    setIsSavingGeneral(false)
    if (res.error) {
      setGeneralStatus({ type: 'error', message: res.error })
    } else {
      setGeneralStatus({ type: 'success', message: 'General preferences saved.' })
      setTimeout(() => setGeneralStatus(null), 4000)
    }
  }

  // Handle Teaching Style Update
  const handleSaveTeaching = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingTeaching(true)
    setTeachingStatus(null)

    const res = await updateTeachingStyleAction({
      learningStyle,
      preferredPacing,
    })

    setIsSavingTeaching(false)
    if (res.error) {
      setTeachingStatus({ type: 'error', message: res.error })
    } else {
      setTeachingStatus({ type: 'success', message: 'Pedagogical style updated.' })
      setTimeout(() => setTeachingStatus(null), 4000)
    }
  }

  const activeAvatarObj =
    PREBUILT_AVATARS.find((a) => a.id === selectedAvatarId) || PREBUILT_AVATARS[0]

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D2A26] flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E5E3DB] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${user.id}`}
            className="p-2 rounded-xl text-[#78716C] hover:text-[#2D2A26] hover:bg-[#EAE7DF]/60 transition-colors flex items-center gap-2 text-sm font-medium"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-[#E5E3DB]" />
          <div>
            <h1 className="text-lg sm:text-xl font-serif font-bold text-[#2D2A26] tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs text-[#78716C] hidden sm:block">
              Select your real-time Simli Face ID avatar persona, voice, and syllabus track.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${user.id}`}
            className="px-3.5 py-1.5 rounded-lg bg-[#C85A43] hover:bg-[#A94734] text-white text-xs font-medium shadow-xs transition-colors"
          >
            Open Classroom
          </Link>
        </div>
      </header>

      {/* Main Settings Stage */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Navigation Tabs Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-1.5 p-1.5 bg-white border border-[#E5E3DB] rounded-2xl shadow-xs overflow-x-auto">
            <button
              onClick={() => handleTabChange('avatars')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'avatars'
                  ? 'bg-[#C85A43] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#2D2A26] hover:bg-[#F5F2EB]'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Avatars & Personas</span>
            </button>

            <button
              onClick={() => handleTabChange('account')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-[#C85A43] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#2D2A26] hover:bg-[#F5F2EB]'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Account & Identity</span>
            </button>

            <button
              onClick={() => handleTabChange('general')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-[#C85A43] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#2D2A26] hover:bg-[#F5F2EB]'
              }`}
            >
              <SettingsIcon className="w-4 h-4 shrink-0" />
              <span>General & Audio</span>
            </button>

            <button
              onClick={() => handleTabChange('teaching')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                activeTab === 'teaching'
                  ? 'bg-[#C85A43] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#2D2A26] hover:bg-[#F5F2EB]'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Teaching Style</span>
            </button>
          </nav>

          {/* Quick Academic Profile Summary Card */}
          <div className="hidden md:block mt-6 p-4 rounded-2xl bg-white border border-[#E5E3DB] shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F5F2EB] border border-[#E5E3DB] flex items-center justify-center font-serif font-bold text-[#C85A43] text-base">
                {fullName ? fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#2D2A26] truncate">
                  {fullName || 'Student'}
                </p>
                <p className="text-[11px] text-[#78716C] truncate">{user.email}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-[#E5E3DB] flex items-center justify-between text-[11px] text-[#78716C]">
              <span>Board Track</span>
              <span className="font-semibold text-[#2D2A26] uppercase">{targetBoard}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#78716C]">
              <span>Grade</span>
              <span className="font-semibold text-[#2D2A26] uppercase">
                {classLevel.replace('_', ' ')}
              </span>
            </div>
          </div>
        </aside>

        {/* Right Settings Content Area */}
        <main className="flex-1 min-w-0">
          {/* ========================================================================= */}
          {/* TAB 1: AVATARS & PERSONAS                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'avatars' && (
            <div className="space-y-6">
              {/* Notification Banner */}
              {avatarSaveMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{avatarSaveMessage}</span>
                </div>
              )}

              {/* Active Classroom Persona Live Stage Preview */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E3DB] shadow-xs flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full p-1.5 bg-white border-2 border-[#E5E3DB] shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={activeAvatarObj.image || `/avatars/${selectedAvatarId}.jpg`}
                    alt="Active Face ID Avatar Preview"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://app.simli.com/characters/trinity2/${selectedAvatarId}.jpg`
                    }}
                  />
                  <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-white/10" />
                </div>

                <div className="flex-1 text-center md:text-left space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Classroom Persona</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D2A26]">
                    {activeAvatarObj.name}
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    {activeAvatarObj.title}
                  </p>
                  <p className="text-xs text-[#57534E] leading-relaxed pt-1">
                    {activeAvatarObj.description}
                  </p>
                  <div className="pt-1 flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F5F2EB] text-[#78716C] border border-[#E5E3DB]">
                      Face ID: {selectedAvatarId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prebuilt Avatars Catalog */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#2D2A26]">
                      Academic Face ID Avatars
                    </h3>
                    <p className="text-xs text-[#78716C]">
                      Select from our collection of verified real-time Simli Trinity avatars.
                    </p>
                  </div>
                  <button
                    onClick={handleResetToDefault}
                    className="text-xs text-[#C85A43] hover:text-[#A94734] font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Default</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PREBUILT_AVATARS.map((avatar) => {
                    const isSelected = selectedAvatarId === avatar.id
                    return (
                      <div
                        key={avatar.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FDF6F0] border-[#C85A43] shadow-xs ring-1 ring-[#C85A43]/30'
                            : 'bg-white border-[#E5E3DB] hover:border-[#D6D3C9]'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-[#E5E3DB] bg-[#F5F2EB]">
                            <img
                              src={avatar.image}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = `https://app.simli.com/characters/trinity2/${avatar.id}.jpg`
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#C85A43]/20 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white drop-shadow-sm" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-[#2D2A26] truncate">
                                {avatar.name}
                              </h4>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                                  avatar.badge === 'Primary Default'
                                    ? 'bg-[#C85A43]/10 text-[#C85A43]'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {avatar.badge}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-[#78716C] truncate">
                              {avatar.subject}
                            </p>
                            <p className="text-[11px] text-[#57534E] line-clamp-2 leading-relaxed">
                              {avatar.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-[#E5E3DB]/60 flex items-center justify-between">
                          <span className="text-[10px] text-[#78716C] font-mono">
                            {avatar.recommendedBoard}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleSelectAvatar(avatar)}
                            disabled={isSelected}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#C85A43] text-white cursor-default'
                                : 'bg-[#F5F2EB] text-[#2D2A26] hover:bg-[#EAE7DF]'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Select Avatar'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Streaming Engine Information */}
              <div className="p-4 rounded-2xl bg-[#F5F2EB]/60 border border-[#E5E3DB] flex items-start gap-3">
                <Shield className="w-4 h-4 text-[#78716C] mt-0.5 shrink-0" />
                <div className="text-xs text-[#57534E] space-y-1">
                  <p className="font-semibold text-[#2D2A26]">
                    Direct Simli Face ID WebRTC Pipeline
                  </p>
                  <p className="leading-relaxed">
                    The classroom streams directly using the chosen Face ID over WebRTC. The avatar mouth movements
                    are driven by incoming 16kHz audio visemes in real time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ACCOUNT & IDENTITY                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {accountStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    accountStatus.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {accountStatus.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{accountStatus.message}</span>
                </div>
              )}

              {/* Personal Details Form */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E3DB] shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#2D2A26]">
                    Student Profile
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Manage your display name, target examination board, and class grade.
                  </p>
                </div>

                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#57534E]">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E5E3DB] text-sm text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#C85A43]/20 focus:border-[#C85A43]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#57534E]">
                      Email Address (Auth Credential)
                    </label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E5E3DB] bg-[#F5F2EB]/50 text-sm text-[#78716C] cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#57534E]">
                        Target Examination Board
                      </label>
                      <select
                        value={targetBoard}
                        onChange={(e) => setTargetBoard(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E5E3DB] bg-white text-sm text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#C85A43]/20"
                      >
                        {BOARD_OPTIONS.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.id} — {b.name.split('(')[0].trim()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#57534E]">
                        Academic Grade (Classes 6-12 Only)
                      </label>
                      <select
                        value={classLevel}
                        onChange={(e) => setClassLevel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E5E3DB] bg-white text-sm text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#C85A43]/20"
                      >
                        {CLASS_LEVEL_OPTIONS.map((c) => (
                          <option key={c.id} value={c.label}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingAccount}
                      className="px-4 py-2 rounded-xl bg-[#C85A43] hover:bg-[#A94734] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      {isUpdatingAccount ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password Management */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E3DB] shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#2D2A26]">
                    Security & Password
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Update your account password for secure session authentication.
                  </p>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#57534E]">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E5E3DB] text-sm text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#C85A43]/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#57534E]">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E5E3DB] text-sm text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#C85A43]/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword}
                      className="px-4 py-2 rounded-xl bg-[#2D2A26] hover:bg-black text-white text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account Signout */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E3DB] shadow-xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#2D2A26]">Active Session</h4>
                  <p className="text-xs text-[#78716C]">
                    Log out from this browser session securely.
                  </p>
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: GENERAL & AUDIO                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {generalStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    generalStatus.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{generalStatus.message}</span>
                </div>
              )}

              {/* Voice & Speech Tuning */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E3DB] shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#2D2A26]">
                    Voice & Speech Cadence
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Select the vocal timbre for the AI tutor and configure conversational responsiveness.
                  </p>
                </div>

                <form onSubmit={handleSaveGeneral} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#57534E]">
                      Preferred Tutor Voice
                    </label>
                    <select
                      value={preferredVoice}
                      onChange={(e) => setPreferredVoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E3DB] bg-white text-sm text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#C85A43]/20"
                    >
                      {VOICE_OPTIONS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} — {v.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#57534E]">
                      Speech Delivery Pacing
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: '0.9', label: 'Measured (0.9x)', desc: 'Deliberate & clear' },
                        { id: '1.0', label: 'Standard (1.0x)', desc: 'Natural classroom rate' },
                        { id: '1.15', label: 'Accelerated (1.15x)', desc: 'Quick revision pace' },
                      ].map((rate) => (
                        <button
                          key={rate.id}
                          type="button"
                          onClick={() => setSpeechRate(rate.id)}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            speechRate === rate.id
                              ? 'bg-[#FDF6F0] border-[#C85A43] text-[#2D2A26]'
                              : 'bg-white border-[#E5E3DB] text-[#57534E] hover:bg-[#F5F2EB]'
                          }`}
                        >
                          <p className="text-xs font-semibold">{rate.label}</p>
                          <p className="text-[10px] text-[#78716C]">{rate.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#E5E3DB]">
                    <div>
                      <p className="text-xs font-semibold text-[#2D2A26]">
                        Continuous Voice Activity Detection (Auto-Listen)
                      </p>
                      <p className="text-[11px] text-[#78716C]">
                        Automatically detects student speaking and pauses tutor without manual button clicks.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoListen}
                      onChange={(e) => setAutoListen(e.target.checked)}
                      className="w-4 h-4 accent-[#C85A43] rounded-sm cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingGeneral}
                      className="px-4 py-2 rounded-xl bg-[#C85A43] hover:bg-[#A94734] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      {isSavingGeneral ? 'Saving...' : 'Save Audio Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TEACHING STYLE                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'teaching' && (
            <div className="space-y-6">
              {teachingStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    teachingStatus.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{teachingStatus.message}</span>
                </div>
              )}

              {/* Pedagogical Cadence Section */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E3DB] shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#2D2A26]">
                    Pedagogical Cadence & Board Alignment
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Control how the AI tutor guides you through laws, derivations, and board-exam questions.
                  </p>
                </div>

                <form onSubmit={handleSaveTeaching} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#57534E]">
                      Teaching Methodology
                    </label>

                    <div className="space-y-2">
                      {[
                        {
                          id: 'socratic',
                          title: 'Socratic Exam-Topper Cadence (Recommended)',
                          desc: 'Strict 6-Stage Cadence: Real-Life Intuition -> Precise Formulation -> Real Example -> Step-by-Step Whiteboard Numerical -> Check Understanding -> Board Exam Numerical. Never lectures more than 2-3 sentences without engagement.',
                        },
                        {
                          id: 'direct',
                          title: 'Direct & High-Velocity Derivation',
                          desc: 'Rapid theoretical formulation, concise law statements, and quick multi-step numerical calculation for fast revision.',
                        },
                        {
                          id: 'visual',
                          title: 'Visual & Vector-First Modeling',
                          desc: 'Emphasizes Mafs.dev mathematical coordinate curves, dynamic SVG force diagrams, and physical analogies before numericals.',
                        },
                      ].map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setLearningStyle(style.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            learningStyle === style.id
                              ? 'bg-[#FDF6F0] border-[#C85A43] ring-1 ring-[#C85A43]/20'
                              : 'bg-white border-[#E5E3DB] hover:bg-[#F5F2EB]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-[#2D2A26]">{style.title}</h4>
                            <input
                              type="radio"
                              name="learning_style"
                              value={style.id}
                              checked={learningStyle === style.id}
                              onChange={() => setLearningStyle(style.id)}
                              className="accent-[#C85A43]"
                            />
                          </div>
                          <p className="text-[11px] text-[#78716C] leading-relaxed mt-1">
                            {style.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chalkboard Note Detail Level */}
                  <div className="space-y-2 pt-2 border-t border-[#E5E3DB]">
                    <label className="text-xs font-semibold text-[#57534E]">
                      Chalkboard Note Density
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setNoteDensity('topper_detailed')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          noteDensity === 'topper_detailed'
                            ? 'bg-[#FDF6F0] border-[#C85A43]'
                            : 'bg-white border-[#E5E3DB] hover:bg-[#F5F2EB]'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#2D2A26]">Topper Master Notes</p>
                        <p className="text-[10px] text-[#78716C] mt-0.5 leading-relaxed">
                          Full layout: Given, Formula, Substitution, Unit Conversions, and Boxed Answers. Single source of truth.
                        </p>
                      </div>

                      <div
                        onClick={() => setNoteDensity('summary_keypoints')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          noteDensity === 'summary_keypoints'
                            ? 'bg-[#FDF6F0] border-[#C85A43]'
                            : 'bg-white border-[#E5E3DB] hover:bg-[#F5F2EB]'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#2D2A26]">Executive Summary</p>
                        <p className="text-[10px] text-[#78716C] mt-0.5 leading-relaxed">
                          High-yield laws and final equations only for students who prefer minimal chalkboard text.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingTeaching}
                      className="px-4 py-2 rounded-xl bg-[#C85A43] hover:bg-[#A94734] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      {isSavingTeaching ? 'Saving...' : 'Save Teaching Style'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
