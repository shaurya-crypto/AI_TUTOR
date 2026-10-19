import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class Geometry3DScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private meshGroup: THREE.Group
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private isDragging: boolean = false
  private previousMousePosition = { x: 0, y: 0 }
  private currentParams: Record<string, any> = {
    shape: 'cube',
    dimension1: 3, // length or radius
    dimension2: 3, // width or height
    dimension3: 3, // height or depth
    wireframe: false,
    color: '#38bdf8',
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(6, 6, 8)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true

    this.meshGroup = new THREE.Group()
    this.scene.add(this.meshGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(8, 12, 8)
    dirLight.castShadow = true
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5)
    fillLight.position.set(-8, -4, -6)
    this.scene.add(fillLight)

    // Grid Floor
    const grid = new THREE.GridHelper(14, 14, 0x10b981, 0x1e3a2b)
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

    this.rebuildMesh()
    this.setupMouseEvents()
    this.startAnimationLoop()
  }

  private rebuildMesh(): void {
    while (this.meshGroup.children.length > 0) {
      const obj = this.meshGroup.children[0] as THREE.Mesh
      if (obj.geometry) obj.geometry.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose())
      } else if (obj.material) {
        obj.material.dispose()
      }
      this.meshGroup.remove(obj)
    }

    const { shape, dimension1, dimension2, dimension3, radius, height, length, width, depth, r, h, wireframe, color } = this.currentParams
    const shapeName = (shape || 'cube').toString().toLowerCase().trim()
    const hasExplicitRadius = radius !== undefined || r !== undefined
    const rad = hasExplicitRadius ? Number(radius ?? r) || 1.5 : (Number(dimension1 ?? length) || 3) / 2
    const hVal = Number(height ?? h ?? dimension2) || 3
    const lenVal = Number(length ?? dimension1) || 3
    const widthVal = Number(width ?? dimension2) || 3
    const depthVal = Number(depth ?? dimension3) || 3

    let geom: THREE.BufferGeometry

    switch (shapeName) {
      case 'cuboid':
      case 'box':
      case 'rectangular_prism':
        geom = new THREE.BoxGeometry(lenVal, widthVal, depthVal)
        break
      case 'sphere':
      case 'ball':
        geom = new THREE.SphereGeometry(rad, 32, 24)
        break
      case 'cylinder':
      case 'pipe':
        geom = new THREE.CylinderGeometry(rad, rad, hVal, 32)
        break
      case 'cone':
        geom = new THREE.ConeGeometry(rad, hVal, 32)
        break
      case 'pyramid':
        geom = new THREE.ConeGeometry(rad, hVal, 4)
        break
      case 'prism':
      case 'triangular_prism':
        geom = new THREE.CylinderGeometry(rad, rad, hVal, 3)
        break
      case 'cube':
      default:
        geom = new THREE.BoxGeometry(lenVal, lenVal, lenVal)
        break
    }

    const mat = new THREE.MeshStandardMaterial({
      color: color || 0x38bdf8,
      roughness: 0.35,
      metalness: 0.2,
      wireframe: !!wireframe,
      transparent: true,
      opacity: 0.88,
    })

    const mesh = new THREE.Mesh(geom, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.meshGroup.add(mesh)

    // Add crisp edge outlines for solid geometric visual clarity
    if (!wireframe) {
      const edges = new THREE.EdgesGeometry(geom)
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
      const line = new THREE.LineSegments(edges, lineMat)
      this.meshGroup.add(line)
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

      this.meshGroup.rotation.y += deltaX * 0.012
      this.meshGroup.rotation.x += deltaY * 0.012

      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      this.isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      this.camera.position.z = Math.max(3, Math.min(22, this.camera.position.z + e.deltaY * 0.01))
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
        this.meshGroup.rotation.y += 0.005
      }

      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  public updateParameters(params: Record<string, any>): void {
    this.currentParams = { ...this.currentParams, ...params }
    this.rebuildMesh()
  }

  public toggleLabels(_show: boolean): void {}

  public toggleMeasurements(_show: boolean): void {}

  public setPaused(paused: boolean): void {
    this.isPaused = paused
  }

  public resetCamera(): void {
    this.camera.position.set(6, 6, 8)
    this.camera.lookAt(0, 0, 0)
    this.meshGroup.rotation.set(0, 0, 0)
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.meshGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
    })
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
