import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class CircuitsInteractiveScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private circuitGroup: THREE.Group
  private electronsGroup: THREE.Group
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private electronOffset: number = 0
  private currentParams: Record<string, any> = {
    circuitType: 'series', // 'series' or 'parallel'
    voltage: 12, // Volts
    r1: 4, // Ohms
    r2: 6, // Ohms
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 15)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.circuitGroup = new THREE.Group()
    this.electronsGroup = new THREE.Group()
    this.scene.add(this.circuitGroup)
    this.scene.add(this.electronsGroup)

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
    while (this.circuitGroup.children.length > 0) {
      this.circuitGroup.remove(this.circuitGroup.children[0])
    }
    while (this.electronsGroup.children.length > 0) {
      this.electronsGroup.remove(this.electronsGroup.children[0])
    }

    const isSeries = this.currentParams.circuitType === 'series'
    const v = Number(this.currentParams.voltage) || 12
    const r1 = Number(this.currentParams.r1) || 4
    const r2 = Number(this.currentParams.r2) || 6

    // Calculations
    const rEquiv = isSeries ? r1 + r2 : (r1 * r2) / (r1 + r2)
    const current = v / Math.max(0.1, rEquiv)

    const wireMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 })
    const resistorMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    const batteryMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })

    if (isSeries) {
      // Series Loop Rectangle [-5, -3] to [5, 3]
      const loop = [
        new THREE.Vector3(-5, -3, 0),
        new THREE.Vector3(5, -3, 0),
        new THREE.Vector3(5, 3, 0),
        new THREE.Vector3(-5, 3, 0),
        new THREE.Vector3(-5, -3, 0),
      ]
      this.circuitGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(loop), wireMat))

      // Battery on Left Wire (x = -5, y = 0)
      const battery = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.2), batteryMat)
      battery.position.set(-5, 0, 0)
      this.circuitGroup.add(battery)

      // Resistor 1 on Top Wire (x = -1.5, y = 3)
      const res1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.2), resistorMat)
      res1.position.set(-1.5, 3, 0)
      this.circuitGroup.add(res1)

      // Resistor 2 on Top Wire (x = 2, y = 3)
      const res2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.2), resistorMat)
      res2.position.set(2, 3, 0)
      this.circuitGroup.add(res2)
    } else {
      // Parallel Circuit (two rungs)
      const mainLoop = [
        new THREE.Vector3(-5, -3, 0),
        new THREE.Vector3(5, -3, 0),
        new THREE.Vector3(5, 3, 0),
        new THREE.Vector3(-5, 3, 0),
        new THREE.Vector3(-5, -3, 0),
      ]
      this.circuitGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mainLoop), wireMat))

      // Middle Rung Wire (y = 0)
      const midRung = [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(5, 0, 0)]
      this.circuitGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(midRung), wireMat))

      // Battery on Left (x = -5, y = 0)
      const battery = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.2), batteryMat)
      battery.position.set(-5, 0, 0)
      this.circuitGroup.add(battery)

      // Resistor 1 on Middle Branch (x = 2, y = 0)
      const res1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.2), resistorMat)
      res1.position.set(2, 0, 0)
      this.circuitGroup.add(res1)

      // Resistor 2 on Top Branch (x = 2, y = 3)
      const res2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.2), resistorMat)
      res2.position.set(2, 3, 0)
      this.circuitGroup.add(res2)
    }

    // Moving electron particles
    const electronCount = 18
    const dotGeom = new THREE.SphereGeometry(0.12, 12, 12)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })

    for (let i = 0; i < electronCount; i++) {
      const dot = new THREE.Mesh(dotGeom, dotMat)
      this.electronsGroup.add(dot)
    }

    this.currentParams.calculatedCurrent = current
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)

      if (!this.isPaused) {
        const current = this.currentParams.calculatedCurrent || 2
        const speed = Math.min(0.08, Math.max(0.005, current * 0.008))
        this.electronOffset = (this.electronOffset + speed) % 1.0

        // Move electrons along perimeter
        const count = this.electronsGroup.children.length
        const perimeter = 32 // 10 + 6 + 10 + 6

        this.electronsGroup.children.forEach((child, i) => {
          const t = ((i / count + this.electronOffset) % 1.0) * perimeter
          let x = 0
          let y = 0

          if (t < 10) {
            // Bottom wire (-5,-3) to (5,-3)
            x = -5 + t
            y = -3
          } else if (t < 16) {
            // Right wire (5,-3) to (5,3)
            x = 5
            y = -3 + (t - 10)
          } else if (t < 26) {
            // Top wire (5,3) to (-5,3)
            x = 5 - (t - 16)
            y = 3
          } else {
            // Left wire (-5,3) to (-5,-3)
            x = -5
            y = 3 - (t - 26)
          }

          child.position.set(x, y, 0.1)
        })
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
