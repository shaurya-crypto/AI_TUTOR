import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class CoordinateGeometryScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private coordGroup: THREE.Group
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private isDragging: boolean = false
  private previousMousePosition = { x: 0, y: 0 }
  private currentParams: Record<string, any> = {
    x1: 2,
    y1: 3,
    z1: 1,
    x2: -2,
    y2: -1,
    z2: -2,
    showProjections: true,
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(8, 8, 12)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.coordGroup = new THREE.Group()
    this.scene.add(this.coordGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(6, 10, 8)
    this.scene.add(dir)

    // Base Grid
    const grid = new THREE.GridHelper(12, 12, 0x10b981, 0x1e3a2b)
    grid.position.y = -3
    this.scene.add(grid)
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
    this.setupMouseEvents()
    this.startLoop()
  }

  private rebuild(): void {
    while (this.coordGroup.children.length > 0) {
      this.coordGroup.remove(this.coordGroup.children[0])
    }

    const p1 = new THREE.Vector3(
      Number(this.currentParams.x1) || 2,
      Number(this.currentParams.y1) || 3,
      Number(this.currentParams.z1) || 1
    )
    const p2 = new THREE.Vector3(
      Number(this.currentParams.x2) || -2,
      Number(this.currentParams.y2) || -1,
      Number(this.currentParams.z2) || -2
    )

    // 1. 3D Coordinate Axes (X=Red, Y=Green, Z=Blue)
    const axisMat = (color: number) => new THREE.LineBasicMaterial({ color, linewidth: 2 })
    // X Axis
    this.coordGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0)]),
        axisMat(0xef4444)
      )
    )
    // Y Axis
    this.coordGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -5, 0), new THREE.Vector3(0, 5, 0)]),
        axisMat(0x22c55e)
      )
    )
    // Z Axis
    this.coordGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, 6)]),
        axisMat(0x38bdf8)
      )
    )

    // 2. Point Spheres
    const dotGeom = new THREE.SphereGeometry(0.25, 16, 16)
    const p1Mesh = new THREE.Mesh(dotGeom, new THREE.MeshStandardMaterial({ color: 0xfacc15 }))
    p1Mesh.position.copy(p1)
    this.coordGroup.add(p1Mesh)

    const p2Mesh = new THREE.Mesh(dotGeom, new THREE.MeshStandardMaterial({ color: 0xf43f5e }))
    p2Mesh.position.copy(p2)
    this.coordGroup.add(p2Mesh)

    // 3. Distance Connecting Vector Line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 })
    this.coordGroup.add(new THREE.Line(lineGeom, lineMat))

    // 4. Midpoint Dot
    const mid = p1.clone().add(p2).multiplyScalar(0.5)
    const midMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xa855f7 })
    )
    midMesh.position.copy(mid)
    this.coordGroup.add(midMesh)

    // 5. Projection Drop-lines to XY/XZ planes
    if (this.currentParams.showProjections) {
      const dropMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.2, gapSize: 0.15 })
      const drop1 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([p1, new THREE.Vector3(p1.x, 0, p1.z)]),
        dropMat
      )
      drop1.computeLineDistances()
      this.coordGroup.add(drop1)

      const drop2 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([p2, new THREE.Vector3(p2.x, 0, p2.z)]),
        dropMat
      )
      drop2.computeLineDistances()
      this.coordGroup.add(drop2)
    }
  }

  private setupMouseEvents(): void {
    if (!this.container) return
    const el = this.container

    const onMouseDown = (e: MouseEvent) => {
      this.isDragging = true
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return
      const deltaX = e.clientX - this.previousMousePosition.x
      const deltaY = e.clientY - this.previousMousePosition.y
      this.coordGroup.rotation.y += deltaX * 0.01
      this.coordGroup.rotation.x += deltaY * 0.01
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => (this.isDragging = false)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      this.camera.position.z = Math.max(5, Math.min(26, this.camera.position.z + e.deltaY * 0.01))
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('wheel', onWheel, { passive: false })
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)
      if (!this.isPaused && !this.isDragging) {
        this.coordGroup.rotation.y += 0.003
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
    this.camera.position.set(8, 8, 12)
    this.camera.lookAt(0, 0, 0)
    this.coordGroup.rotation.set(0, 0, 0)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
