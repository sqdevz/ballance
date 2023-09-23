import { Vec3, World } from 'cannon-es'
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js'
import CannonDebugRenderer from './cannonDebugRenderer'

// A simple interface to generate a scene
export class SceneManager {
  sizes = { width: window.innerWidth, height: window.innerHeight }
  camera = new PerspectiveCamera(75, this.sizes.width / this.sizes.height)
  scene = new Scene()
  cannonDebugRenderer!: CannonDebugRenderer

  time = Date.now()
  deltaTime!: number
  renderer!: WebGLRenderer

  // Lighting
  ambientLight = new AmbientLight(0xffffff, 0.5)
  directionalLight = new DirectionalLight(0xffffff, 0.8)

  // Controls
  yaw: number = 0.0
  pitch: number = 0.25
  controls!: FirstPersonControls
  pressedKeys = new Set()

  // Limits
  pitchLimit = Math.PI * 0.45

  constructor(canvas: HTMLCanvasElement, physicsWorld: World) {
    this.defaultCameraSetup()
    this.defaultRenderer(canvas)
    this.lightingSetup()
    this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, physicsWorld)
    this.controls = new FirstPersonControls(this.camera, canvas)
  }

  resize = () => {
    this.sizes.width = window.innerWidth
    this.sizes.height = window.innerHeight
    this.camera.aspect = this.sizes.width / this.sizes.height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.sizes.width, this.sizes.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    console.log(this.sizes)
  }

  render = () => {
    this.renderer.render(this.scene, this.camera)
  }

  lightingSetup = () => {
    this.directionalLight.position.set(0, 1, 1)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 1024
    this.directionalLight.shadow.mapSize.height = 1024
    this.directionalLight.shadow.radius = 5

    this.scene.add(this.directionalLight)
    this.scene.add(this.ambientLight)
  }

  defaultRenderer = (canvas: HTMLCanvasElement) => {
    this.renderer = new WebGLRenderer({ canvas, alpha: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setSize(this.sizes.width, this.sizes.height)
  }

  defaultCameraSetup = () => {
    this.camera.position.set(3, 3, 3)
    this.camera.lookAt(new Vector3(0, 0, 0))
  }

  getDeltaTime = () => {
    const currentTime = Date.now()
    const deltaTime = (currentTime - this.time) * 0.001
    this.time = currentTime
    return deltaTime
  }

  processUpdates = (updaters, physicsWorld) => {
    const currentTime = Date.now()
    this.deltaTime = (currentTime - this.time) * 0.001
    this.time = currentTime

    this.controls.update(this.deltaTime * 10)
    physicsWorld.step(Math.min(this.deltaTime, 0.1))
    this.cannonDebugRenderer.update()
    for (let i = 0; i < updaters.length; i++) updaters[i]()
  }

  updateCameraView = (event) => {
    this.yaw -= event.movementX * 0.01
    this.pitch -= event.movementY * 0.01
    if (this.pitch > this.pitchLimit) {
      this.pitch = this.pitchLimit
    }
    if (this.pitch < -this.pitchLimit) {
      this.pitch = -this.pitchLimit
    }
  }

  updatePlayer = (player) => {
    let offset = new Vector3(-5, 0, 0)
    offset.applyAxisAngle(new Vector3(0, 0, 1), this.pitch)
    offset.applyAxisAngle(new Vector3(0, 1, 0), this.yaw)
    this.camera.position.x = player.position.x + offset.x
    this.camera.position.y = player.position.y + offset.y
    this.camera.position.z = player.position.z + offset.z
    this.camera.lookAt(
      new Vector3(player.position.x, player.position.y, player.position.z),
    )

    let forward = new Vector3(500, 0, 0)
    forward.applyAxisAngle(new Vector3(0, 1, 0), this.yaw)

    if (this.pressedKeys.has('w')) {
      player.applyForce(
        new Vec3(forward.x * this.deltaTime, 0, forward.z * this.deltaTime),
      )
    }
    if (this.pressedKeys.has('s')) {
      player.applyForce(
        new Vec3(-forward.x * this.deltaTime, 0, -forward.z * this.deltaTime),
      )
    }
    if (this.pressedKeys.has('a')) {
      player.applyForce(
        new Vec3(forward.z * this.deltaTime, 0, -forward.x * this.deltaTime),
      )
    }
    if (this.pressedKeys.has('d')) {
      player.applyForce(
        new Vec3(-forward.z * this.deltaTime, 0, forward.x * this.deltaTime),
      )
    }
  }
}
