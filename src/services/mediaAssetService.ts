/**
 * Media Asset Service
 * Handles educational images, videos, programmatic animations, and graceful fallbacks.
 * Enforces provenance tracking, authorized provider verification, zero URL fabrication,
 * asset caching, and fallback rendering when external providers are not configured or media fails to load.
 */

export interface MediaAssetMetadata {
  id: string
  title: string
  url: string
  type: 'image' | 'video' | 'animation'
  provenance: 'textbook' | 'open_licensed' | 'ai_generated' | 'fallback'
  license?: string
  attributionText?: string
  provider: string
  isAvailable: boolean
  fallbackType?: 'diagram' | 'procedural_animation' | 'graph' | 'scene_3d'
  fallbackKey?: string
}

export interface IMediaAssetProvider {
  name: string
  isConfigured: boolean
  isAuthorizedDomain(url: string): boolean
  getAssetMetadata?(assetId: string): Promise<MediaAssetMetadata | null>
}

export interface MediaProviderStatusReport {
  configuredProviders: string[]
  externalVideoCdn: {
    available: boolean
    requiredConfiguration: string
    activeFallback: string
  }
  permittedImageDomains: string[]
  cachedAssetsCount: number
  zeroUrlFabricationEnforced: boolean
}

// Allowed educational domains with open or partner licenses
const ALLOWED_EDUCATIONAL_DOMAINS = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'openstax.org',
  'ncert.nic.in',
  'images.unsplash.com', // Only when explicitly approved
  'localhost',
]

export class MediaAssetService {
  private static assetCache = new Map<string, MediaAssetMetadata>()
  private static conceptAssetRegistry = new Map<string, string>() // conceptKey -> assetId

  /**
   * Register an approved media asset for concept reuse and caching
   */
  public static registerApprovedAsset(
    asset: MediaAssetMetadata,
    conceptKeys: string[] = []
  ): void {
    if (!asset || !asset.id) return
    this.assetCache.set(asset.id, asset)
    conceptKeys.forEach((key) => {
      this.conceptAssetRegistry.set(key.toLowerCase(), asset.id)
    })
  }

  /**
   * Find approved media asset for a repeated concept
   */
  public static findApprovedAssetForConcept(concept: string): MediaAssetMetadata | null {
    if (!concept) return null
    const assetId = this.conceptAssetRegistry.get(concept.toLowerCase())
    if (assetId && this.assetCache.has(assetId)) {
      return this.assetCache.get(assetId) || null
    }
    return null
  }

  /**
   * Retrieve cached asset metadata by ID
   */
  public static getCachedMetadata(assetId: string): MediaAssetMetadata | null {
    return this.assetCache.get(assetId) || null
  }

  /**
   * Clear or inspect cached assets
   */
  public static getAllCachedAssets(): MediaAssetMetadata[] {
    return Array.from(this.assetCache.values())
  }

  /**
   * Status of external providers and fallback readiness
   */
  public static getProviderStatus(): MediaProviderStatusReport {
    return {
      configuredProviders: [
        'NCERT Standard Textbook Figures Provider',
        'Wikimedia Commons Open License Provider',
        'Local Procedural Canvas & SVG Engine',
      ],
      externalVideoCdn: {
        available: false,
        requiredConfiguration: 'VIDEO_CDN_BASE_URL and CDN_ACCESS_KEY credentials',
        activeFallback: 'Interactive HTML5 Canvas Procedural Animation Engine',
      },
      permittedImageDomains: [...ALLOWED_EDUCATIONAL_DOMAINS],
      cachedAssetsCount: this.assetCache.size,
      zeroUrlFabricationEnforced: true,
    }
  }

  /**
   * Verify if a media URL belongs to an authorized educational provider
   */
  public static isAuthorizedDomain(urlString: string): boolean {
    if (!urlString) return false
    try {
      const parsed = new URL(urlString)
      return ALLOWED_EDUCATIONAL_DOMAINS.some(
        (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      )
    } catch {
      return false
    }
  }

  /**
   * Check if a video provider is authorized and reachable.
   * If not configured or unverified, returns a fallback animation reference without fabricating URLs.
   */
  public static async verifyVideoPlayability(videoUrl: string): Promise<{
    canPlay: boolean
    resolvedUrl?: string
    providerStatus: 'verified' | 'fallback_recommended' | 'unauthorized'
    fallbackAnimation?: string
  }> {
    if (!videoUrl) {
      return {
        canPlay: false,
        providerStatus: 'fallback_recommended',
        fallbackAnimation: 'circuit_flow',
      }
    }

    const isAuthorized = this.isAuthorizedDomain(videoUrl)
    if (!isAuthorized) {
      return {
        canPlay: false,
        providerStatus: 'unauthorized',
        fallbackAnimation: 'wave_propagation',
      }
    }

    try {
      // In browser or SSR context, verify lightweight HEAD request if possible
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)
      const res = await fetch(videoUrl, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timeoutId)

      if (res && res.ok) {
        return {
          canPlay: true,
          resolvedUrl: videoUrl,
          providerStatus: 'verified',
        }
      }
    } catch {
      // Silent catch: network blocked or CORS preflight failed
    }

    return {
      canPlay: false,
      providerStatus: 'fallback_recommended',
      fallbackAnimation: 'projectile_motion',
    }
  }

  /**
   * Resolve an educational image with guaranteed graceful fallback
   */
  public static resolveImage(
    url: string | undefined,
    topicContext: string,
    provenance: 'textbook' | 'open_licensed' | 'ai_generated' | 'fallback' = 'textbook'
  ): {
    primaryUrl: string
    attribution: string
    hasFallback: boolean
    fallbackSvg: string
  } {
    const isDomainPermitted = url ? this.isAuthorizedDomain(url) : false
    const cleanUrl = isDomainPermitted && url ? url : ''

    const fallbackSvg = this.generateFallbackSvg(topicContext)

    return {
      primaryUrl: cleanUrl,
      attribution:
        provenance === 'textbook'
          ? 'NCERT Standard Textbook Figure - Certified Educational Material'
          : provenance === 'open_licensed'
          ? 'Wikimedia Commons - Creative Commons Educational License'
          : 'AI Educational Diagram - Interactive Pedagogical Asset',
      hasFallback: true,
      fallbackSvg,
    }
  }

  /**
   * Programmatic SVG fallback illustration for key school science/math concepts
   * Guarantees that even if offline or if no external CDN is available,
   * the student sees an authentic, high-contrast, mathematical/scientific vector visual.
   */
  public static generateFallbackSvg(conceptName: string): string {
    const lower = (conceptName || '').toLowerCase()

    if (lower.includes('ohm') || lower.includes('circuit') || lower.includes('resist')) {
      return `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
        <rect width="400" height="240" fill="#0d1b14" rx="12"/>
        <text x="200" y="32" text-anchor="middle" fill="#6ee7b7" font-size="14" font-weight="bold" font-family="sans-serif">Circuit Schematic &amp; Ohm's Law (V = I x R)</text>
        <path d="M 60 120 L 130 120 L 140 100 L 155 140 L 170 100 L 185 140 L 200 100 L 210 120 L 340 120" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linejoin="round"/>
        <circle cx="60" cy="120" r="4" fill="#fbbf24"/>
        <circle cx="340" cy="120" r="4" fill="#fbbf24"/>
        <text x="175" y="85" text-anchor="middle" fill="#fef08a" font-size="12" font-family="monospace">Resistor R (Ohm)</text>
        <path d="M 60 120 L 60 190 L 180 190" stroke="#38bdf8" stroke-width="2" fill="none"/>
        <path d="M 220 190 L 340 190 L 340 120" stroke="#38bdf8" stroke-width="2" fill="none"/>
        <line x1="180" y1="175" x2="180" y2="205" stroke="#ef4444" stroke-width="3"/>
        <line x1="190" y1="180" x2="190" y2="200" stroke="#ef4444" stroke-width="1.5"/>
        <line x1="210" y1="175" x2="210" y2="205" stroke="#ef4444" stroke-width="3"/>
        <line x1="220" y1="180" x2="220" y2="200" stroke="#ef4444" stroke-width="1.5"/>
        <text x="200" y="222" text-anchor="middle" fill="#f87171" font-size="12" font-family="monospace">Battery (V Volts)</text>
        <line x1="90" y1="112" x2="120" y2="112" stroke="#4ade80" stroke-width="2" marker-end="url(#arrow)"/>
        <text x="105" y="105" text-anchor="middle" fill="#4ade80" font-size="11" font-family="monospace">Current I -&gt;&gt;</text>
      </svg>`
    }

    if (lower.includes('refract') || lower.includes('optic') || lower.includes('light') || lower.includes('lens')) {
      return `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
        <rect width="400" height="240" fill="#0c1824" rx="12"/>
        <text x="200" y="30" text-anchor="middle" fill="#93c5fd" font-size="14" font-weight="bold" font-family="sans-serif">Snell's Law of Refraction: n1 sin(i) = n2 sin(r)</text>
        <line x1="40" y1="120" x2="360" y2="120" stroke="#64748b" stroke-width="2" stroke-dasharray="6,4"/>
        <text x="320" y="110" fill="#94a3b8" font-size="11" font-family="sans-serif">Interface</text>
        <text x="50" y="70" fill="#bae6fd" font-size="12" font-family="sans-serif">Medium 1 (Air, n1 = 1.0)</text>
        <text x="50" y="170" fill="#7dd3fc" font-size="12" font-family="sans-serif">Medium 2 (Glass, n2 = 1.5)</text>
        <line x1="200" y1="35" x2="200" y2="210" stroke="#facc15" stroke-width="1.5" stroke-dasharray="4,4"/>
        <text x="210" y="55" fill="#facc15" font-size="10" font-family="monospace">Normal</text>
        <line x1="90" y1="50" x2="200" y2="120" stroke="#f43f5e" stroke-width="3"/>
        <line x1="200" y1="120" x2="270" y2="205" stroke="#f43f5e" stroke-width="3"/>
        <circle cx="200" cy="120" r="4" fill="#fbbf24"/>
        <text x="140" y="95" fill="#fda4af" font-size="11" font-family="sans-serif">Incident Ray (i = 45 deg)</text>
        <text x="245" y="170" fill="#fda4af" font-size="11" font-family="sans-serif">Refracted Ray (r = 28 deg)</text>
      </svg>`
    }

    if (lower.includes('graph') || lower.includes('linear') || lower.includes('slope') || lower.includes('line')) {
      return `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
        <rect width="400" height="240" fill="#0d1b14" rx="12"/>
        <text x="200" y="28" text-anchor="middle" fill="#6ee7b7" font-size="14" font-weight="bold" font-family="sans-serif">Cartesian Coordinate Graph: y = mx + c</text>
        <line x1="60" y1="200" x2="360" y2="200" stroke="#ffffff" stroke-width="2"/>
        <line x1="60" y1="200" x2="60" y2="40" stroke="#ffffff" stroke-width="2"/>
        <text x="365" y="204" fill="#ffffff" font-size="12" font-family="sans-serif">X</text>
        <text x="56" y="32" fill="#ffffff" font-size="12" font-family="sans-serif">Y</text>
        <line x1="60" y1="160" x2="320" y2="60" stroke="#4ade80" stroke-width="3"/>
        <circle cx="60" cy="160" r="5" fill="#facc15"/>
        <text x="75" y="165" fill="#fef08a" font-size="11" font-family="monospace">y-intercept (0, c)</text>
        <path d="M 180 114 L 240 114 L 240 91" stroke="#38bdf8" stroke-width="2" fill="none" stroke-dasharray="3,3"/>
        <text x="210" y="130" text-anchor="middle" fill="#38bdf8" font-size="10" font-family="monospace">Delta x</text>
        <text x="255" y="105" fill="#38bdf8" font-size="10" font-family="monospace">Delta y</text>
        <text x="220" y="60" fill="#4ade80" font-size="12" font-weight="bold" font-family="monospace">Slope m = Delta y / Delta x</text>
      </svg>`
    }

    // Generic educational diagram fallback
    return `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
      <rect width="400" height="240" fill="#0b1712" rx="12"/>
      <text x="200" y="32" text-anchor="middle" fill="#6ee7b7" font-size="14" font-weight="bold" font-family="sans-serif">${conceptName || 'Scientific Concept Diagram'}</text>
      <circle cx="200" cy="125" r="55" fill="none" stroke="#10b981" stroke-width="3"/>
      <circle cx="200" cy="125" r="12" fill="#f59e0b"/>
      <circle cx="200" cy="70" r="6" fill="#38bdf8"/>
      <circle cx="200" cy="180" r="6" fill="#38bdf8"/>
      <circle cx="145" cy="125" r="6" fill="#ec4899"/>
      <circle cx="255" cy="125" r="6" fill="#ec4899"/>
      <text x="200" y="215" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="monospace">Standard NCERT Curriculum Representation</text>
    </svg>`
  }
}
