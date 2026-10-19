import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class WaveHarmonicsScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private waveGroup: THREE.Group
  private particleMeshes: THREE.Mesh[] = []
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private time: number = 0
  private currentParams: Record<string, any> = {
    amplitude: 1.8,
    frequency: 1.0, // Hz
    wavelength: 4.0,
    waveType: 'transverse', // 'transverse' or 'longitudinal'
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 15)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.waveGroup = new THREE.Group()
    this.scene.add(this.waveGroup)

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0))
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
    while (this.waveGroup.children.length > 0) {
      this.waveGroup.remove(this.waveGroup.children[0])
    }
    this.particleMeshes = []

    // Center Baseline equilibrium axis
    const axis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-6, 0, 0),
        new THREE.Vector3(6, 0, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 })
    )
    this.waveGroup.add(axis)

    // Discrete medium particles
    const particleCount = 48
    const geom = new THREE.SphereGeometry(0.14, 12, 12)
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(geom, mat)
      this.waveGroup.add(mesh)
      this.particleMeshes.push(mesh)
    }
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)

      if (!this.isPaused) {
        this.time += 0.03
        const A = Number(this.currentParams.amplitude) || 1.8
        const f = Number(this.currentParams.frequency) || 1.0
        const lambda = Number(this.currentParams.wavelength) || 4.0
        const isLongitudinal = this.currentParams.waveType === 'longitudinal'

        const k = (2 * Math.PI) / Math.max(0.5, lambda)
        const omega = 2 * Math.PI * f
        const count = this.particleMeshes.length

        for (let i = 0; i < count; i++) {
          const x0 = -5.5 + (i / (count - 1)) * 11.0
          const phase = k * x0 - omega * this.time
          const displacement = A * Math.sin(phase)

          if (isLongitudinal) {
            // Particle moves along X axis (compression & rarefaction)
            this.particleMeshes[i].position.set(x0 + displacement * 0.4, 0, 0)
          } else {
            // Transverse wave moves perpendicular along Y axis
            this.particleMeshes[i].position.set(x0, displacement, 0)
          }
        }
      }

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
    this.camera.position.set(0, 0, 15)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
