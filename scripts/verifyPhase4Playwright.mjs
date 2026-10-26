import { chromium } from 'playwright'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const PORT = 3005
const BASE_URL = `http://localhost:${PORT}`
const ARTIFACT_DIR = path.resolve('public/test-screenshots')

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        return true
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`)
}

async function run() {
  console.log(`[Playwright Suite] Starting Next.js production server on port ${PORT}...`)
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    stdio: 'inherit',
  })

  try {
    await waitForServer(BASE_URL)
    console.log(`[Playwright Suite] Server ready at ${BASE_URL}`)

    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    })

    // ==========================================
    // 1. Verify /login Page
    // ==========================================
    console.log('[Playwright Suite] Inspecting /login...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    const heading = await page.textContent('h1')
    console.log(`[Playwright Suite] Login heading: "${heading}"`)
    if (!heading || !heading.includes('Come on in.')) {
      throw new Error(`Expected "Come on in.", got "${heading}"`)
    }

    const googleBtn = await page.isVisible('button:has-text("Continue with Google")')
    console.log(`[Playwright Suite] Google button visible: ${googleBtn}`)
    if (!googleBtn) throw new Error('Google sign-in button not found')

    const emailInput = await page.isVisible('input[type="email"]')
    console.log(`[Playwright Suite] Email input visible: ${emailInput}`)
    if (!emailInput) throw new Error('Email input not found')

    const continueBtn = await page.isVisible('button:has-text("Continue with email")')
    console.log(`[Playwright Suite] Continue with email button visible: ${continueBtn}`)
    if (!continueBtn) throw new Error('Continue with email button not found')

    const archImage = await page.isVisible('img[alt*="Classical"]')
    console.log(`[Playwright Suite] Classical Arch image visible: ${archImage}`)
    if (!archImage) throw new Error('Classical Arch image not visible')

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-login-screen.png') })
    console.log('[Playwright Suite] Saved screenshot: 01-login-screen.png')

    // ==========================================
    // 2. Verify /onboarding Page
    // ==========================================
    console.log('[Playwright Suite] Inspecting /onboarding...')
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Q0: Preferred Language selection
    const q0Text = await page.textContent('main')
    console.log(`[Playwright Suite] Q0 Language content found: ${q0Text?.includes('language do you prefer')}`)
    if (!q0Text?.includes('language do you prefer')) {
      throw new Error('Question 0 ("Which language do you prefer for your AI tutor?") not displayed')
    }

    const hinglishBtn = page.locator('button:has-text("Hinglish")')
    await hinglishBtn.waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-onboarding-q0-language.png') })
    console.log('[Playwright Suite] Saved screenshot: 02-onboarding-q0-language.png')

    // Select Hinglish to auto-advance
    await hinglishBtn.click()
    await page.waitForTimeout(600)

    // Q1: What's your name?
    const q1Text = await page.textContent('main')
    console.log(`[Playwright Suite] Q1 content found: ${q1Text?.includes("What's your name?")}`)
    if (!q1Text?.includes("What's your name?")) {
      throw new Error('Question 1 ("What\'s your name?") not displayed')
    }

    const q1Input = page.locator('input[placeholder="Type your name..."]')
    await q1Input.waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-onboarding-q1-name.png') })
    console.log('[Playwright Suite] Saved screenshot: 03-onboarding-q1-name.png')

    // Fill Name and Advance
    await q1Input.fill('Aarav Sharma')
    await page.click('button[aria-label="Submit answer"]')
    await page.waitForTimeout(600)

    // Q2: How old are you?
    const q2Text = await page.textContent('main')
    console.log(`[Playwright Suite] Q2 content found: ${q2Text?.includes('How old are you?')}`)
    if (!q2Text?.includes('How old are you?')) {
      throw new Error('Question 2 ("How old are you?") not displayed')
    }

    const q2Input = page.locator('input[placeholder*="age"]')
    await q2Input.waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-onboarding-q2-age.png') })
    console.log('[Playwright Suite] Saved screenshot: 04-onboarding-q2-age.png')

    // Fill Age and Advance
    await q2Input.fill('16')
    await page.click('button[aria-label="Submit answer"]')
    await page.waitForTimeout(600)

    // Q3: What grade are you in?
    const q3Text = await page.textContent('main')
    console.log(`[Playwright Suite] Q3 content found: ${q3Text?.includes('What grade are you in?')}`)
    if (!q3Text?.includes('What grade are you in?')) {
      throw new Error('Question 3 ("What grade are you in?") not displayed')
    }

    const grade10Btn = page.locator('button:has-text("10th grade")')
    await grade10Btn.waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-onboarding-q3-grade.png') })
    console.log('[Playwright Suite] Saved screenshot: 05-onboarding-q3-grade.png')

    // Click Grade 10 to auto-advance
    await grade10Btn.click()
    await page.waitForTimeout(600)

    // Q4: Board selection
    const q4Text = await page.textContent('main')
    console.log(`[Playwright Suite] Q4 content found: ${q4Text?.includes('educational board')}`)
    if (!q4Text?.includes('educational board')) {
      throw new Error('Question 4 (Board selection) not displayed')
    }

    const cbseBtn = page.locator('button:has-text("CBSE")')
    await cbseBtn.waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06-onboarding-q4-board.png') })
    console.log('[Playwright Suite] Saved screenshot: 06-onboarding-q4-board.png')

    // Click CBSE to auto-advance
    await cbseBtn.click()
    await page.waitForTimeout(600)

    // Q5: Career aspiration
    const q5Text = await page.textContent('main')
    console.log(`[Playwright Suite] Q5 content found: ${q5Text?.includes('pursue or become in the future?')}`)
    if (!q5Text?.includes('pursue or become in the future?')) {
      throw new Error('Question 5 (Career aspiration) not displayed')
    }

    const q5Input = page.locator('input[placeholder*="Aerospace"]')
    await q5Input.waitFor({ state: 'visible' })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07-onboarding-q5-aspiration.png') })
    console.log('[Playwright Suite] Saved screenshot: 07-onboarding-q5-aspiration.png')

    await browser.close()
    console.log('[Playwright Suite] ALL ASSERTIONS PASSED!')
  } finally {
    server.kill()
  }
}

run().catch((err) => {
  console.error('[Playwright Suite] ERROR:', err)
  process.exit(1)
})
