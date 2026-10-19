import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class LinearGraphScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private graphGroup: THREE.Group
  private animationFrameId: number | null = null
  private currentParams: Record<string, any> = {
    slope: 1.5, // m
    intercept: 1.0, // c: y = mx + c
    showSlopeTriangle: true,
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 16)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.graphGroup = new THREE.Group()
    this.scene.add(this.graphGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
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
    while (this.graphGroup.children.length > 0) {
      this.graphGroup.remove(this.graphGroup.children[0])
    }

    const m = Number(this.currentParams.slope) || 1
    const c = Number(this.currentParams.intercept) || 0
    const showTriangle = !!this.currentParams.showSlopeTriangle

    // 1. Coordinate Grid Lines
    const gridHelper = new THREE.GridHelper(16, 16, 0x10b981, 0x1e3a2b)
    gridHelper.rotation.x = Math.PI / 2
    this.graphGroup.add(gridHelper)

    // 2. Axes X and Y
    const axisMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    const xPoints = [new THREE.Vector3(-8, 0, 0), new THREE.Vector3(8, 0, 0)]
    const yPoints = [new THREE.Vector3(0, -8, 0), new THREE.Vector3(0, 8, 0)]

    this.graphGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPoints), axisMat))
    this.graphGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(yPoints), axisMat))

    // 3. Line: y = mx + c from x = -6 to x = 6
    const x1 = -6
    const y1 = m * x1 + c
    const x2 = 6
    const y2 = m * x2 + c

    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, 0.05),
      new THREE.Vector3(x2, y2, 0.05),
    ])
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 4 })
    this.graphGroup.add(new THREE.Line(lineGeom, lineMat))

    // 4. Intercept Dot (0, c)
    const dotGeom = new THREE.SphereGeometry(0.2, 16, 16)
    const interceptDot = new THREE.Mesh(dotGeom, new THREE.MeshBasicMaterial({ color: 0xf59e0b }))
    interceptDot.position.set(0, c, 0.1)
    this.graphGroup.add(interceptDot)

    // 5. Rise-over-Run Slope Triangle at x=1 to x=3
    if (showTriangle) {
      const tx1 = 1
      const ty1 = m * tx1 + c
      const tx2 = 3
      const ty2 = m * tx2 + c

      const trianglePoints = [
        new THREE.Vector3(tx1, ty1, 0.08),
        new THREE.Vector3(tx2, ty1, 0.08), // run
        new THREE.Vector3(tx2, ty2, 0.08), // rise
      ]
      const triangleGeom = new THREE.BufferGeometry().setFromPoints(trianglePoints)
      const triangleMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 3 })
      this.graphGroup.add(new THREE.Line(triangleGeom, triangleMat))
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
    this.camera.position.set(0, 0, 16)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
