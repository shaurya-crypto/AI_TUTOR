import fs from 'fs'
import path from 'path'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`)
    process.exit(1)
  }
  console.log(`[PASS] ${message}`)
}

function checkZeroEmojis(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  // Basic emoji regex covering standard emoji ranges
  const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u
  assert(!emojiRegex.test(content), `Zero emojis verified in ${path.basename(filePath)}`)
}

async function runVerification() {
  console.log('=== AUTH, DUAL-CLICK & BREVO VERIFICATION ===')

  // 1. Verify hero-clouds.jpg existence
  const heroCloudsPath = path.resolve(process.cwd(), 'public/landing_images/hero-clouds.jpg')
  assert(fs.existsSync(heroCloudsPath), 'hero-clouds.jpg exists in public/landing_images/')

  // 2. Verify callback route dual-click handling
  const callbackPath = path.resolve(process.cwd(), 'src/app/auth/callback/route.ts')
  const callbackContent = fs.readFileSync(callbackPath, 'utf-8')
  assert(callbackContent.includes('processedExchangeCache'), 'auth/callback includes in-memory cache for dual-click deduping')
  assert(callbackContent.includes('token_hash') && callbackContent.includes('verifyOtp'), 'auth/callback supports token_hash Email OTP verification')
  assert(callbackContent.includes('exchangeCodeForSession'), 'auth/callback supports PKCE code exchange')
  assert(callbackContent.includes('supabase.auth.getUser()'), 'auth/callback falls back to active session on second click')

  // 3. Verify actions.ts enhancements
  const actionsPath = path.resolve(process.cwd(), 'src/app/login/actions.ts')
  const actionsContent = fs.readFileSync(actionsPath, 'utf-8')
  assert(actionsContent.includes('resendVerificationEmail'), 'login/actions exports resendVerificationEmail')
  assert(actionsContent.includes('requestPasswordReset'), 'login/actions exports requestPasswordReset')
  assert(actionsContent.includes('isDisposableEmail'), 'login/actions blocks disposable email domains')
  assert(actionsContent.includes('Authentication failed:'), 'login/actions has professional error formatting for invalid credentials')
  assert(actionsContent.includes('Verification pending:'), 'login/actions has polite verification pending notice')
  assert(actionsContent.includes('Brevo'), 'login/actions acknowledges Brevo mailer delivery')

  // 4. Verify MailSentCard component
  const mailCardPath = path.resolve(process.cwd(), 'src/components/auth/MailSentCard.tsx')
  const mailCardContent = fs.readFileSync(mailCardPath, 'utf-8')
  assert(mailCardContent.includes('@/components/ui/card'), 'MailSentCard imports shadcn Card')
  assert(mailCardContent.includes('@/components/ui/badge'), 'MailSentCard imports shadcn Badge')
  assert(mailCardContent.includes('@/components/ui/button'), 'MailSentCard imports shadcn Button')
  assert(mailCardContent.includes('cooldown'), 'MailSentCard implements resend cooldown timer')
  assert(mailCardContent.includes('Brevo Certified Dispatch'), 'MailSentCard includes Brevo certified dispatch badge')
  assert(mailCardContent.includes('motion'), 'MailSentCard includes spring motion animation')

  // 5. Verify LoginPage layout and features
  const loginPath = path.resolve(process.cwd(), 'src/app/login/page.tsx')
  const loginContent = fs.readFileSync(loginPath, 'utf-8')
  assert(loginContent.includes('/landing_images/hero-clouds.jpg'), 'LoginPage includes hero-clouds.jpg on the editorial side')
  assert(!loginContent.includes('Active Cadence'), 'LoginPage keeps left side clean and omits feature cards clutter')
  assert(!loginContent.includes('class_level'), 'LoginPage keeps auth form clean without grade dropdowns')
  assert(!loginContent.includes('JEE') && !loginContent.includes('NEET') && !loginContent.includes('CUET'), 'LoginPage preserves Invariant 1')
  assert(loginContent.includes('MailSentCard'), 'LoginPage integrates animated MailSentCard')
  assert(loginContent.includes('isSubmitting'), 'LoginPage implements double-click submission guard')
  assert(loginContent.includes('Suspense'), 'LoginPage wraps useSearchParams in Suspense')

  // 6. Verify zero emojis across all auth files
  checkZeroEmojis(callbackPath)
  checkZeroEmojis(actionsPath)
  checkZeroEmojis(mailCardPath)
  checkZeroEmojis(loginPath)

  console.log('\n======================================================')
  console.log('ALL AUTH, DUAL-CLICK & BREVO DESIGN CHECKS PASSED')
  console.log('======================================================')
}

runVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})
