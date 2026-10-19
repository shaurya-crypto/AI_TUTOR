import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class BohrAtomScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private atomGroup: THREE.Group
  private electronsList: { mesh: THREE.Mesh; shellRadius: number; speed: number; angle: number }[] = []
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private isDragging: boolean = false
  private previousMousePosition = { x: 0, y: 0 }
  private currentParams: Record<string, any> = {
    element: 'carbon', // 'hydrogen', 'helium', 'carbon', 'oxygen', 'sodium'
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 16)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.atomGroup = new THREE.Group()
    this.scene.add(this.atomGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const p1 = new THREE.PointLight(0x38bdf8, 2, 50)
    p1.position.set(5, 5, 8)
    this.scene.add(p1)
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
    while (this.atomGroup.children.length > 0) {
      this.atomGroup.remove(this.atomGroup.children[0])
    }
    this.electronsList = []

    const el = (this.currentParams.element || 'carbon').toLowerCase()
    let atomicNumber = 6 // default Carbon

    if (el === 'hydrogen') atomicNumber = 1
    else if (el === 'helium') atomicNumber = 2
    else if (el === 'oxygen') atomicNumber = 8
    else if (el === 'sodium') atomicNumber = 11

    // 1. Central Nucleus Cluster (Protons + Neutrons)
    const nucleusGroup = new THREE.Group()
    const nucleonGeom = new THREE.SphereGeometry(0.35, 16, 16)
    const protonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    const neutronMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })

    for (let i = 0; i < atomicNumber; i++) {
      // Proton
      const p = new THREE.Mesh(nucleonGeom, protonMat)
      p.position.set(
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.0
      )
      nucleusGroup.add(p)

      // Neutron
      const n = new THREE.Mesh(nucleonGeom, neutronMat)
      n.position.set(
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.0
      )
      nucleusGroup.add(n)
    }
    this.atomGroup.add(nucleusGroup)

    // Shell Capacities: K=2, L=8, M=8
    const shellRadii = [2.6, 4.4, 6.2]
    const shellCounts = [
      Math.min(2, atomicNumber),
      Math.min(8, Math.max(0, atomicNumber - 2)),
      Math.min(8, Math.max(0, atomicNumber - 10)),
    ]

    const electronGeom = new THREE.SphereGeometry(0.18, 16, 16)
    const electronMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })

    shellCounts.forEach((count, sIdx) => {
      if (count <= 0) return
      const radius = shellRadii[sIdx]

      // Draw Orbit Ring
      const ringGeom = new THREE.RingGeometry(radius - 0.03, radius + 0.03, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      this.atomGroup.add(ring)

      // Add electrons on this shell
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const eMesh = new THREE.Mesh(electronGeom, electronMat)
        this.atomGroup.add(eMesh)

        this.electronsList.push({
          mesh: eMesh,
          shellRadius: radius,
          speed: 0.025 / (sIdx + 1),
          angle,
        })
      }
    })
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
      this.atomGroup.rotation.y += deltaX * 0.01
      this.atomGroup.rotation.x += deltaY * 0.01
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

      if (!this.isPaused) {
        this.electronsList.forEach((e) => {
          e.angle += e.speed
          e.mesh.position.set(
            Math.cos(e.angle) * e.shellRadius,
            Math.sin(e.angle) * e.shellRadius,
            0
          )
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
    this.camera.position.set(0, 0, 16)
    this.atomGroup.rotation.set(0, 0, 0)
  }
  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
