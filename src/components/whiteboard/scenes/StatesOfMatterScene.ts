import * as THREE from 'three'
import { IInteractiveScene } from './sceneTypes'

export class StatesOfMatterScene implements IInteractiveScene {
  private container: HTMLDivElement | null = null
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private containerBox: THREE.LineSegments | null = null
  private particlesGroup: THREE.Group
  private particlesData: {
    mesh: THREE.Mesh
    pos: THREE.Vector3
    vel: THREE.Vector3
    basePos: THREE.Vector3
  }[] = []
  private animationFrameId: number | null = null
  private isPaused: boolean = false
  private currentParams: Record<string, any> = {
    state: 'liquid', // 'solid', 'liquid', 'gas'
    temperature: 300, // Kelvin
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(0, 0, 14)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.particlesGroup = new THREE.Group()
    this.scene.add(this.particlesGroup)

    this.setupLighting()
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(5, 5, 8)
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
    while (this.particlesGroup.children.length > 0) {
      this.particlesGroup.remove(this.particlesGroup.children[0])
    }
    this.particlesData = []

    // Container Cube Wireframe [-3 to 3]
    if (this.containerBox) this.scene.remove(this.containerBox)
    const boxGeom = new THREE.BoxGeometry(6, 6, 4)
    this.containerBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeom),
      new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 })
    )
    this.scene.add(this.containerBox)

    const state = this.currentParams.state || 'liquid'
    const temp = Number(this.currentParams.temperature) || 300
    const particleGeom = new THREE.SphereGeometry(0.22, 16, 16)

    let particleColor = 0x38bdf8
    if (state === 'gas' || temp > 373) particleColor = 0xf43f5e
    else if (state === 'solid' || temp < 273) particleColor = 0xa5f3fc

    const particleMat = new THREE.MeshStandardMaterial({
      color: particleColor,
      roughness: 0.2,
      metalness: 0.1,
    })

    if (state === 'solid') {
      // 4x4x3 tightly packed crystal lattice at the bottom
      for (let x = -2; x <= 2; x += 1.0) {
        for (let y = -2.5; y <= -0.5; y += 1.0) {
          for (let z = -1.2; z <= 1.2; z += 1.0) {
            const p = new THREE.Mesh(particleGeom, particleMat)
            const base = new THREE.Vector3(x, y, z)
            p.position.copy(base)
            this.particlesGroup.add(p)
            this.particlesData.push({
              mesh: p,
              pos: p.position,
              vel: new THREE.Vector3(),
              basePos: base,
            })
          }
        }
      }
    } else if (state === 'liquid') {
      // Bounded fluid cluster at container bottom with moderate drift
      for (let i = 0; i < 40; i++) {
        const p = new THREE.Mesh(particleGeom, particleMat)
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 5.0,
          -2.4 + Math.random() * 2.2,
          (Math.random() - 0.5) * 3.0
        )
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04
        )
        p.position.copy(pos)
        this.particlesGroup.add(p)
        this.particlesData.push({ mesh: p, pos, vel, basePos: pos.clone() })
      }
    } else {
      // Gas: Highly energetic particles bouncing across entire container
      for (let i = 0; i < 28; i++) {
        const p = new THREE.Mesh(particleGeom, particleMat)
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 5.4,
          (Math.random() - 0.5) * 5.4,
          (Math.random() - 0.5) * 3.4
        )
        const speed = 0.08 + (temp / 500) * 0.06
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed
        )
        p.position.copy(pos)
        this.particlesGroup.add(p)
        this.particlesData.push({ mesh: p, pos, vel, basePos: pos.clone() })
      }
    }
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)

      if (!this.isPaused) {
        const state = this.currentParams.state || 'liquid'
        const temp = Number(this.currentParams.temperature) || 300
        const vibFactor = Math.min(0.12, (temp / 400) * 0.06)

        this.particlesData.forEach((pd) => {
          if (state === 'solid') {
            // High frequency micro-vibration around lattice base
            pd.mesh.position.set(
              pd.basePos.x + (Math.random() - 0.5) * vibFactor,
              pd.basePos.y + (Math.random() - 0.5) * vibFactor,
              pd.basePos.z + (Math.random() - 0.5) * vibFactor
            )
          } else if (state === 'liquid') {
            // Fluid motion bounded to bottom half [-2.6, 0.2]
            pd.pos.add(pd.vel)
            if (pd.pos.x < -2.6 || pd.pos.x > 2.6) pd.vel.x *= -1
            if (pd.pos.y < -2.6 || pd.pos.y > 0.4) pd.vel.y *= -1
            if (pd.pos.z < -1.7 || pd.pos.z > 1.7) pd.vel.z *= -1
            pd.mesh.position.copy(pd.pos)
          } else {
            // Gas bouncing across full boundaries [-2.8, 2.8]
            pd.pos.add(pd.vel)
            if (pd.pos.x < -2.7 || pd.pos.x > 2.7) pd.vel.x *= -1
            if (pd.pos.y < -2.7 || pd.pos.y > 2.7) pd.vel.y *= -1
            if (pd.pos.z < -1.7 || pd.pos.z > 1.7) pd.vel.z *= -1
            pd.mesh.position.copy(pd.pos)
          }
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
