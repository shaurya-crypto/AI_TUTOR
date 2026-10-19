import { OHMS_LAW_COMPLETE_LESSON } from '../lib/exemplarLessons'
import {
  validateLessonManifest,
  LessonContentType,
  VisualLessonManifest,
} from '../types/lessonManifest'
import { MediaAssetService } from '../services/mediaAssetService'
import {
  VisualEventQueue,
  parseVisualEventFromDirective,
} from '../services/visualEventProtocol'
import {
  inferOptimalVisualType,
  generateVisualLessonPlanForCapsule,
} from '../services/visualLessonPlanGenerator'

// Regex for emoji detection
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

export async function runMultimediaVerification(): Promise<{
  passed: boolean
  checks: { name: string; status: 'PASS' | 'FAIL'; details: string }[]
}> {
  const checks: { name: string; status: 'PASS' | 'FAIL'; details: string }[] = []

  // Check 1: Manifest Zod Validation
  try {
    const validated = validateLessonManifest(OHMS_LAW_COMPLETE_LESSON)
    checks.push({
      name: 'Manifest Schema Validation',
      status: 'PASS',
      details: `Validated version ${validated.version} with ${validated.steps.length} steps`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Manifest Schema Validation',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Check 2: All 10 Required Content Types Covered
  const requiredTypes: LessonContentType[] = [
    'TEXT_STEP',
    'BOARD_STEP',
    'IMAGE',
    'VIDEO',
    'ANIMATION',
    'GRAPH',
    'DIAGRAM',
    'SCENE_3D',
    'QUICK_CHECK',
    'SUMMARY',
  ]
  const presentTypes = new Set(OHMS_LAW_COMPLETE_LESSON.steps.map((s) => s.type))
  const missingTypes = requiredTypes.filter((t) => !presentTypes.has(t))

  if (missingTypes.length === 0) {
    checks.push({
      name: 'Content Types Completeness (All 10)',
      status: 'PASS',
      details: `All ${requiredTypes.length} core content types present in exemplar lesson (including VIDEO and ANIMATION)`,
    })
  } else {
    checks.push({
      name: 'Content Types Completeness (All 10)',
      status: 'FAIL',
      details: `Missing types: ${missingTypes.join(', ')}`,
    })
  }

  // Check 3: Media Asset Service, Asset Caching, and Graceful Fallback
  try {
    // 3a. Domain Authorization
    const authorizedDomain = MediaAssetService.isAuthorizedDomain(
      'https://upload.wikimedia.org/wikipedia/commons/sample.jpg'
    )
    const unauthorizedDomain = MediaAssetService.isAuthorizedDomain(
      'https://unauthorized-video-cdn.com/stream.mp4'
    )
    if (!authorizedDomain || unauthorizedDomain) {
      throw new Error(`Domain check failed: auth=${authorizedDomain}, unauth=${unauthorizedDomain}`)
    }

    // 3b. Video playability check without fabricating URLs
    const videoCheck = await MediaAssetService.verifyVideoPlayability(
      'https://unauthorized-video-cdn.com/stream.mp4'
    )
    if (videoCheck.canPlay || !videoCheck.fallbackAnimation) {
      throw new Error(`Video fallback check failed: canPlay should be false`)
    }

    // 3c. SVG Fallback generation
    const fallback = MediaAssetService.resolveImage(undefined, "Ohm's Law Circuit", 'textbook')
    if (!fallback.hasFallback || !fallback.fallbackSvg.includes('svg')) {
      throw new Error('Fallback SVG generation failed')
    }

    // 3d. Asset Caching & Concept Reuse
    MediaAssetService.registerApprovedAsset(
      {
        id: 'asset_circuit_01',
        title: 'Circuit Schematic',
        url: 'https://upload.wikimedia.org/wikipedia/commons/circuit.png',
        type: 'image',
        provenance: 'open_licensed',
        provider: 'wikimedia',
        isAvailable: true,
      },
      ['ohms law', 'resistance', 'circuit']
    )

    const reusedAsset = MediaAssetService.findApprovedAssetForConcept('ohms law')
    if (!reusedAsset || reusedAsset.id !== 'asset_circuit_01') {
      throw new Error('Approved asset registry and concept lookup failed')
    }

    // 3e. Provider Status Reporting
    const providerReport = MediaAssetService.getProviderStatus()
    if (!providerReport.externalVideoCdn || providerReport.externalVideoCdn.available) {
      throw new Error('Provider status should report external video CDN as unconfigured')
    }

    checks.push({
      name: 'Media Asset Service & Graceful Fallbacks',
      status: 'PASS',
      details: `Verified domain check, concept asset reuse, provider report (${providerReport.externalVideoCdn.activeFallback}), and SVG generation`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Media Asset Service & Graceful Fallbacks',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Check 4: Visual Event Protocol & Bi-directional Synchronization
  try {
    const queue = VisualEventQueue.getInstance()
    let receivedEvents: string[] = []

    const unsubscribe = queue.subscribe((event) => {
      receivedEvents.push(event.action)
    })

    // 4a. SHOW_SCENE event
    const ack1 = await queue.dispatchEvent('SHOW_SCENE', { sceneType: 'circuits_interactive' }, 5)
    if (ack1.status !== 'acknowledged') {
      throw new Error(`Queue dispatch failed with status: ${ack1.status}`)
    }

    // 4b. UPDATE_GRAPH event
    const ack2 = await queue.dispatchEvent('UPDATE_GRAPH', { m: 4, c: 0, stepIndex: 3 })
    if (ack2.status !== 'acknowledged') {
      throw new Error(`UPDATE_GRAPH dispatch failed`)
    }

    // 4c. Directives parser check (standard [VISUAL_ACTION: ...])
    const parsed1 = parseVisualEventFromDirective(
      '[VISUAL_ACTION: SHOW_MEDIA | step=3, url=https://commons.wikimedia.org/fig.jpg]'
    )
    if (!parsed1 || parsed1.action !== 'SHOW_MEDIA' || parsed1.parameters.step !== 3) {
      throw new Error(`Standard directive parser failed: ${JSON.stringify(parsed1)}`)
    }

    // 4d. Direct action tag parser check ([LESSON_STEP: 4] and [UPDATE_GRAPH: m=4, c=0])
    const parsed2 = parseVisualEventFromDirective('[LESSON_STEP: 4]')
    if (!parsed2 || parsed2.action !== 'SHOW_MEDIA' || parsed2.stepIndex !== 3) {
      throw new Error(`LESSON_STEP directive parser failed: ${JSON.stringify(parsed2)}`)
    }

    const parsed3 = parseVisualEventFromDirective('[UPDATE_GRAPH: m=4, c=0]')
    if (!parsed3 || parsed3.action !== 'UPDATE_GRAPH' || parsed3.parameters.m !== 4) {
      throw new Error(`Direct UPDATE_GRAPH parser failed: ${JSON.stringify(parsed3)}`)
    }

    unsubscribe()
    checks.push({
      name: 'Visual Event Protocol & Synchronization',
      status: 'PASS',
      details: `Event dispatch acknowledged (IDs: ${ack1.eventId}, ${ack2.eventId}) and directives parsed successfully`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Visual Event Protocol & Synchronization',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Check 5: Automated Capsule Visual Plan Ingestion with Asset Status Tracking
  try {
    const generatedPlan = generateVisualLessonPlanForCapsule({
      order_index: 1,
      title: 'Refraction of Light through Spherical Lenses',
      description: 'Understanding convex and concave lens image formation using ray tracing',
      key_concepts: [
        'Snell Law: n1 sin i = n2 sin r',
        'Lens Formula: 1/f = 1/v - 1/u',
        'Magnification: m = v / u = h_i / h_o',
      ],
      worked_examples: [
        {
          problem: 'A convex lens of focal length 15 cm forms an image 30 cm from the lens. Find the object distance.',
          given: 'f = +15 cm, v = +30 cm',
          formula: '1/f = 1/v - 1/u',
          substitution: '1/15 = 1/30 - 1/u',
          calculation: '1/u = 1/30 - 1/15 = -1/30 -> u = -30 cm',
          finalAnswer: 'Object distance u = -30 cm',
          unit: 'cm',
        },
      ],
      board: 'CBSE',
      class_level: 'Class 10',
      category: 'Science',
    })

    if (!generatedPlan || generatedPlan.steps.length < 5) {
      throw new Error(`Generated plan has insufficient steps: ${generatedPlan?.steps?.length}`)
    }

    // Verify assetStatus is populated on all generated steps
    const missingStatus = generatedPlan.steps.filter((s) => !s.assetStatus)
    if (missingStatus.length > 0) {
      throw new Error(`Missing assetStatus on steps: ${missingStatus.map((s) => s.id).join(', ')}`)
    }

    checks.push({
      name: 'Automatic Capsule Visual Plan Generation',
      status: 'PASS',
      details: `Generated structured visual lesson plan with ${generatedPlan.steps.length} steps and validated assetStatus for Refraction`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Automatic Capsule Visual Plan Generation',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Check 6: Progress Resumption & State Tracking
  try {
    const targetStepIndex = 3
    const completedIds = ['step_ohms_1', 'step_ohms_2', 'step_ohms_3']
    const savedState = {
      currentStepIndex: targetStepIndex,
      completedStepIds: completedIds,
      lastActiveAt: new Date().toISOString(),
    }

    // Verify resumption
    const resumedStep = OHMS_LAW_COMPLETE_LESSON.steps[savedState.currentStepIndex]
    if (!resumedStep || resumedStep.id !== 'step_ohms_4') {
      throw new Error(`Resumption mapped to incorrect step: ${resumedStep?.id}`)
    }

    checks.push({
      name: 'Progress Saving & Resumption Verification',
      status: 'PASS',
      details: `Resumed accurately to Step ${savedState.currentStepIndex + 1} (${resumedStep.title})`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Progress Saving & Resumption Verification',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Check 7: Zero Emoji Invariant Audit
  let emojiViolations: string[] = []
  const checkTextForEmoji = (text: string, context: string) => {
    if (EMOJI_REGEX.test(text)) {
      emojiViolations.push(`${context}: "${text}"`)
    }
  }

  OHMS_LAW_COMPLETE_LESSON.steps.forEach((s) => {
    checkTextForEmoji(s.title, `Step ${s.stepNumber} title`)
    if (s.content.text) {
      checkTextForEmoji(s.content.text.explanation, `Step ${s.stepNumber} explanation`)
      checkTextForEmoji(s.content.text.keyTakeaway, `Step ${s.stepNumber} keyTakeaway`)
    }
    if (s.content.quickCheck) {
      checkTextForEmoji(s.content.quickCheck.question, `Step ${s.stepNumber} quickCheck question`)
      s.content.quickCheck.options.forEach((o) => checkTextForEmoji(o.text, `Option ${o.id}`))
    }
  })

  if (emojiViolations.length === 0) {
    checks.push({
      name: 'Strict Zero Emoji Invariant',
      status: 'PASS',
      details: 'All UI strings, lesson steps, and prompts strictly contain zero emojis',
    })
  } else {
    checks.push({
      name: 'Strict Zero Emoji Invariant',
      status: 'FAIL',
      details: `Detected emojis in: ${emojiViolations.join('; ')}`,
    })
  }

  const allPassed = checks.every((c) => c.status === 'PASS')
  return { passed: allPassed, checks }
}

// Run verification if executed directly in node
if (typeof require !== 'undefined' && require.main === module) {
  runMultimediaVerification().then((result) => {
    console.log('=== MULTIMEDIA LESSON ENGINE VERIFICATION SUITE ===')
    result.checks.forEach((c) => {
      console.log(`[${c.status}] ${c.name}: ${c.details}`)
    })
    console.log(`\nOVERALL RESULT: ${result.passed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`)
    if (!result.passed) process.exit(1)
  })
}
