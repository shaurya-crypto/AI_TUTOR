import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class OpticsRefractionScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private opticsGroup: THREE.Group
  private animationFrameId: number | null = null
  private currentParams: Record<string, any> = {
    incidentAngle: 45, // degrees from normal
    n1: 1.0, // Air
    n2: 1.5, // Glass or Water
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 14)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.opticsGroup = new THREE.Group()
    this.scene.add(this.opticsGroup)

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
    while (this.opticsGroup.children.length > 0) {
      this.opticsGroup.remove(this.opticsGroup.children[0])
    }

    const theta1Deg = Number(this.currentParams.incidentAngle) || 45
    const n1 = Number(this.currentParams.n1) || 1.0
    const n2 = Number(this.currentParams.n2) || 1.5

    const theta1Rad = (theta1Deg * Math.PI) / 180
    // Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
    const sinTheta2 = (n1 * Math.sin(theta1Rad)) / n2
    const isTIR = sinTheta2 > 1.0 // Total Internal Reflection

    // 1. Medium 2 Boundary Block (bottom half)
    const mediumGeom = new THREE.PlaneGeometry(12, 6)
    const mediumMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
    })
    const medium = new THREE.Mesh(mediumGeom, mediumMat)
    medium.position.set(0, -3, -0.05)
    this.opticsGroup.add(medium)

    // Interface Line (y = 0)
    const interfacePoints = [new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0)]
    const interfaceLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(interfacePoints),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    )
    this.opticsGroup.add(interfaceLine)

    // 2. Normal Line (x = 0 dashed)
    const normalPoints = [new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, -5, 0)]
    const normalLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(normalPoints),
      new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.3, gapSize: 0.2 })
    )
    normalLine.computeLineDistances()
    this.opticsGroup.add(normalLine)

    // 3. Incident Ray (incoming from top-left towards origin)
    const rayLength = 5.5
    const incX = -rayLength * Math.sin(theta1Rad)
    const incY = rayLength * Math.cos(theta1Rad)

    const incGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(incX, incY, 0.05),
      new THREE.Vector3(0, 0, 0.05),
    ])
    const incMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 4 }) // bright yellow laser
    this.opticsGroup.add(new THREE.Line(incGeom, incMat))

    // 4. Reflected Ray (top-right)
    const reflGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.05),
      new THREE.Vector3(-incX, incY, 0.05),
    ])
    const reflMat = new THREE.LineBasicMaterial({
      color: isTIR ? 0xfacc15 : 0xfef08a,
      transparent: !isTIR,
      opacity: isTIR ? 1.0 : 0.45,
      linewidth: isTIR ? 4 : 2,
    })
    this.opticsGroup.add(new THREE.Line(reflGeom, reflMat))

    // 5. Refracted Ray (bottom-right if not TIR)
    if (!isTIR) {
      const theta2Rad = Math.asin(sinTheta2)
      const refrX = rayLength * Math.sin(theta2Rad)
      const refrY = -rayLength * Math.cos(theta2Rad)

      const refrGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0.05),
        new THREE.Vector3(refrX, refrY, 0.05),
      ])
      const refrMat = new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 4 })
      this.opticsGroup.add(new THREE.Line(refrGeom, refrMat))
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
  public setPaused(_paused: boolean): void {}
  public resetCamera(): void {
    this.camera.position.set(0, 0, 14)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
