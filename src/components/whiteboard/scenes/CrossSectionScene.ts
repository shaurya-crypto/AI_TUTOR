import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class CrossSectionScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private meshGroup: THREE.Group
  private planeMesh: THREE.Mesh | null = null
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private isDragging: boolean = false
  private previousMousePosition = { x: 0, y: 0 }
  private currentParams: Record<string, any> = {
    shape: 'cylinder',
    slicePosition: 0, // -2 to 2
    sliceAngle: 0, // 0 to 90 degrees
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(7, 5, 8)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.meshGroup = new THREE.Group()
    this.scene.add(this.meshGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(6, 10, 6)
    this.scene.add(dir)

    const grid = new THREE.GridHelper(12, 12, 0x10b981, 0x1e3a2b)
    grid.position.y = -2.5
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
    this.startAnimationLoop()
  }

  private rebuild(): void {
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0])
    }

    const { shape, slicePosition, sliceAngle } = this.currentParams
    const yPos = Number(slicePosition) || 0
    const angleRad = ((Number(sliceAngle) || 0) * Math.PI) / 180

    // 1. Semi-transparent 3D volume
    let geom: THREE.BufferGeometry
    if (shape === 'cone') {
      geom = new THREE.ConeGeometry(2, 4, 32)
    } else if (shape === 'sphere') {
      geom = new THREE.SphereGeometry(2, 32, 24)
    } else if (shape === 'cube') {
      geom = new THREE.BoxGeometry(3, 3, 3)
    } else {
      geom = new THREE.CylinderGeometry(1.8, 1.8, 4, 32)
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
    })
    const body = new THREE.Mesh(geom, bodyMat)
    this.meshGroup.add(body)

    const edges = new THREE.EdgesGeometry(geom)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x7dd3fc }))
    this.meshGroup.add(line)

    // 2. Translucent cutting plane
    const planeGeom = new THREE.PlaneGeometry(5.5, 5.5)
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    })
    this.planeMesh = new THREE.Mesh(planeGeom, planeMat)
    this.planeMesh.rotation.x = Math.PI / 2 + angleRad
    this.planeMesh.position.y = yPos
    this.meshGroup.add(this.planeMesh)

    // Plane edge border
    const planeBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeom),
      new THREE.LineBasicMaterial({ color: 0xfde047, linewidth: 2 })
    )
    this.planeMesh.add(planeBorder)
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
      this.meshGroup.rotation.y += deltaX * 0.012
      this.meshGroup.rotation.x += deltaY * 0.012
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => (this.isDragging = false)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      this.camera.position.z = Math.max(3, Math.min(20, this.camera.position.z + e.deltaY * 0.01))
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('wheel', onWheel, { passive: false })
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)
      if (!this.isPaused && !this.isDragging) {
        this.meshGroup.rotation.y += 0.004
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
    this.camera.position.set(7, 5, 8)
    this.camera.lookAt(0, 0, 0)
    this.meshGroup.rotation.set(0, 0, 0)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
