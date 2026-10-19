import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class PhysicsForcesScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private forceGroup: THREE.Group
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private currentParams: Record<string, any> = {
    mass: 5, // kg
    appliedForce: 30, // N
    frictionCoeff: 0.3, // mu
    inclineAngle: 0, // degrees
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 3, 14)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.forceGroup = new THREE.Group()
    this.scene.add(this.forceGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(5, 8, 5)
    this.scene.add(dir)
  }

  public init(container: HTMLDivElement): void {
    this.container = container
    const width = container.clientWidth || 400
    const height = container.clientHeight || 400

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)

    container.innerHTML = ''
    container.appendChild(this.renderer.domElement)

    this.rebuild()
    this.startLoop()
  }

  private rebuild(): void {
    while (this.forceGroup.children.length > 0) {
      this.forceGroup.remove(this.forceGroup.children[0])
    }

    const mass = Number(this.currentParams.mass) || 5
    const fApplied = Number(this.currentParams.appliedForce) || 30
    const mu = Number(this.currentParams.frictionCoeff) || 0.3
    const angleDeg = Number(this.currentParams.inclineAngle) || 0
    const angleRad = (angleDeg * Math.PI) / 180

    // Physics calculations
    const g = 9.8
    const weight = mass * g
    const normalForce = weight * Math.cos(angleRad)
    const frictionMax = mu * normalForce
    const netForce = Math.max(0, fApplied - weight * Math.sin(angleRad) - frictionMax)

    // Incline or Surface Platform
    const platformGeom = new THREE.BoxGeometry(10, 0.4, 3)
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    const platform = new THREE.Mesh(platformGeom, platformMat)
    platform.rotation.z = angleRad
    platform.position.set(0, -1, 0)
    this.forceGroup.add(platform)

    // Object Box (mass)
    const boxSize = 1.6
    const boxGeom = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
    const block = new THREE.Mesh(boxGeom, boxMat)
    block.rotation.z = angleRad
    block.position.set(0, boxSize / 2 - 0.8, 0)
    this.forceGroup.add(block)

    // Vector Helper: Arrow with Head
    const addVector = (dir: THREE.Vector3, length: number, color: number, _label: string) => {
      if (length <= 0.05) return
      const scaleLen = Math.min(4.5, Math.max(0.8, length * 0.08))
      const origin = block.position.clone()
      const arrow = new THREE.ArrowHelper(dir.normalize(), origin, scaleLen, color, 0.4, 0.25)
      this.forceGroup.add(arrow)
    }

    // 1. Weight Vector (Always straight down)
    addVector(new THREE.Vector3(0, -1, 0), weight, 0xf59e0b, 'W = mg')

    // 2. Normal Force (Perpendicular to plane)
    const normalDir = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), angleRad)
    addVector(normalDir, normalForce, 0x4ade80, 'Normal (N)')

    // 3. Applied Force (Parallel to plane, pointing right/up)
    const appliedDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), angleRad)
    addVector(appliedDir, fApplied, 0x38bdf8, 'F_applied')

    // 4. Friction Force (Parallel to plane, opposing motion)
    const frictionDir = appliedDir.clone().negate()
    addVector(frictionDir, frictionMax, 0xf43f5e, 'f_friction')

    // 5. Net Force Indicator (if accelerating)
    if (netForce > 0.5) {
      addVector(appliedDir, netForce, 0xa855f7, 'F_net = m*a')
    }
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  public updateParameters(params: Record<string, any>): void {
    this.currentParams = { ...this.currentParams, ...params }
    this.rebuild()
  }

  public toggleLabels(_show: boolean): void {}
  public toggleMeasurements(_show: boolean): void {}
  public setPaused(paused: boolean): void {
    this.isPaused = paused
  }
  public resetCamera(): void {
    this.camera.position.set(0, 3, 14)
    this.camera.lookAt(0, 0, 0)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
