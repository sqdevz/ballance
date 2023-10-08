import './style.css'
import io from 'socket.io-client'
import $ from 'jquery'

import { SceneManager } from './SceneManager.ts'

import { Body, Sphere, Vec3, World } from 'cannon-es'
import {
  Color,
  Mesh,
  MeshNormalMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import {
  AbstractObject,
  BoxObject,
  CylinderObject,
  SphereObject,
} from './ObjectAbstract.ts'
import { setPositionByCopy, setRotationByCopy } from '../common/entity.ts'

// config: different maps, arbitrary 3d shapes
// ball, box, cylinder
// player spawn (loc)
// static/dynamic/force/lava
// D.O.O.R.S

const canvas: HTMLCanvasElement = document.querySelector(
  'canvas.webgl',
) as HTMLCanvasElement

const world = new World()
world.gravity.set(0, -9.82, 0)

let manager: SceneManager = new SceneManager(canvas, world)

// HACK: list of update functions
const updaters: (() => void)[] = []

var playerBody: Body | null = null

function createDisplayOnlyMesh(entity: any, material: any) {
  let object: AbstractObject
  switch (entity.shape.type) {
    case 'Ballance$CylinderShape':
      object = new CylinderObject(entity, material)
      break
    case 'Ballance$SphereShape':
      object = new SphereObject(entity, material)
      break
    case 'Ballance$BoxShape':
      object = new BoxObject(entity, material, { isTrigger: true })
      break
    default:
      console.log('Entity Shape Type is not found')
      return
  }
  manager.scene.add(object.mesh)
  world.addBody(object.physics_body)
  return object.physics_body
}

// forces to apply per time unit, as a Map<BodyId, Map<BodyId, Vec3>>
const forces = {}

const initializeEntity = (entity: any, physicsBodyId: number | null) => {
  switch (entity.type) {
    case 'Ballance$PlayerSpawn':
      const radius = 0.5
      const normalMaterial = new MeshNormalMaterial()
      const sphereGeometry = new SphereGeometry(radius)
      const sphereMesh = new Mesh(sphereGeometry, normalMaterial)
      setPositionByCopy(sphereMesh, entity)
      sphereMesh.castShadow = true
      manager.scene.add(sphereMesh)
      const sphereShape = new Sphere(radius)
      const sphereBody = new Body({ mass: 1.0 })
      sphereBody.addShape(sphereShape)
      setPositionByCopy(sphereBody, sphereMesh)
      world.addBody(sphereBody)
      updaters.push(() => {
        setPositionByCopy(sphereMesh, sphereBody)
        setRotationByCopy(sphereMesh, sphereBody)
      })
      if (physicsBodyId == null && playerBody == null) {
        playerBody = sphereBody
      } else if (physicsBodyId == sphereBody.id) {
        playerBody = sphereBody
      }
      break

    case 'Ballance$WorldObject':
      const mass = entity.behaviour === 'static' ? 0.0 : 1.0
      const color = new Color(entity.color.r, entity.color.g, entity.color.b)
      const material = new MeshPhongMaterial({ color })
      material.transparent = true
      material.opacity = entity.color.a
      let object: AbstractObject
      switch (entity.shape.type) {
        case 'Ballance$BoxShape':
          object = new BoxObject(entity, material, { mass })
          break

        case 'Ballance$CylinderShape':
          object = new CylinderObject(entity, material, { mass })
          break

        case 'Ballance$SphereShape':
          object = new SphereObject(entity, material, { mass })
          break
        default:
          return
      }
      manager.scene.add(object.mesh)
      world.addBody(object.physics_body)
      updaters.push(() => {
        setPositionByCopy(object.mesh, object.physics_body)
        setRotationByCopy(object.mesh, object.physics_body)
      })
      break

    case 'Ballance$ForceZone':
      {
        const material = new MeshStandardMaterial({ color: 0xff00ff })
        material.transparent = true
        material.opacity = 0.5
        const forceBody = createDisplayOnlyMesh(entity, material)
        forceBody.addEventListener('collide', (event) => {
          forces[event.body.id] = forces[event.body.id] || {}
          forces[event.body.id][forceBody.id] = new Vec3(
            entity.magnitude.x,
            entity.magnitude.y,
            entity.magnitude.z,
          )
        })
        world.addEventListener('endContact', (event) => {
          if (event.bodyA == forceBody) {
            delete forces[event.bodyB.id][forceBody.id]
            if (Object.keys(forces[event.bodyB.id]).length == 0) {
              delete forces[event.bodyB.id]
            }
          }
          if (event.bodyB == forceBody) {
            delete forces[event.bodyA.id][forceBody.id]
            if (Object.keys(forces[event.bodyA.id]).length == 0) {
              delete forces[event.bodyA.id]
            }
          }
        })
      }
      break

    case 'Ballance$WinZone':
      {
        const material = new MeshStandardMaterial({ color: 0xffff00 })
        material.transparent = true
        material.opacity = 0.5
        const body = createDisplayOnlyMesh(entity, material)
        body.addEventListener('collide', (event) => {
          if (event.body == playerBody) {
            // alert('You Win! Please Refresh')
          }
        })
      }
      break

    case 'Ballance$DeathZone':
      {
        const material = new MeshStandardMaterial({ color: 0xff0000 })
        material.transparent = true
        material.opacity = 0.5
        const body = createDisplayOnlyMesh(entity, material)
        body.addEventListener('collide', (event) => {
          if (event.body == playerBody) {
            // alert('You Lose! Please Refresh')
          }
        })
      }
      break
  }
}

function initializeLevel(level, physicsBodyId: number | null = null) {
  playerBody = null
  for (let i = 0; i < level.entities.length; i++) {
    initializeEntity(level.entities[i], physicsBodyId)
  }
}

const hashLocation = window.location.hash
let socket = null
if (hashLocation.startsWith('#')) {
  let jsonPath = hashLocation.substring(1) + '.json'
  $.ajax({
    url: jsonPath,
    type: 'GET',
    dataType: 'json',
    success: function (data, status) {
      console.assert(status === 'success')
      initializeLevel(data)
    },
    error: function (_) {
      window.alert(`please add ${jsonPath} to the server root`)
    },
  })
} else {
  socket = io('ws://localhost:3000')
  socket.on('connect', () => {
    socket.emit('ping', new Uint16Array([1, 2, 3]))
  })
  socket.on('pong', (data) => {
    console.log('received pong', data)
  })
  socket.on('start-game', (data) => {
    initializeLevel(data.level, data.physicsBodyId)
  })
  socket.on('world-state', (data) => {
    const buffer = new Float32Array(data)
    for (let i = 0; i < world.bodies.length; i++) {
      const body: Body = world.bodies[i]
      body.position.x = buffer[i * 13 + 0]
      body.position.y = buffer[i * 13 + 1]
      body.position.z = buffer[i * 13 + 2]
      // body.quaternion.setFromEuler(buffer[i * 13 + 3], buffer[i * 13 + 4], buffer[i * 13 + 5])
      body.quaternion.x = buffer[i * 13 + 3]
      body.quaternion.y = buffer[i * 13 + 4]
      body.quaternion.z = buffer[i * 13 + 5]
      body.velocity.x = buffer[i * 13 + 6]
      body.velocity.y = buffer[i * 13 + 7]
      body.velocity.z = buffer[i * 13 + 8]
      body.angularVelocity.x = buffer[i * 13 + 9]
      body.angularVelocity.y = buffer[i * 13 + 10]
      body.angularVelocity.z = buffer[i * 13 + 11]
      body.quaternion.w = buffer[i * 13 + 12]
    }
  })
}

window.addEventListener('keydown', onDocumentKeyDown, false)
window.addEventListener('keyup', onDocumentKeyUp, false)
function onDocumentKeyDown(event: KeyboardEvent) {
  manager.pressedKeys.add(event.key)
}
function onDocumentKeyUp(event: KeyboardEvent) {
  manager.pressedKeys.delete(event.key)
}

canvas.addEventListener('click', () => {
  canvas.requestPointerLock()
})

document.addEventListener('mousemove', (event) => {
  manager.updateCameraView(event)
})

const tick = () => {
  manager.processUpdates(updaters, world)

  for (let id of Object.keys(forces)) {
    let forceX = 0.0
    let forceY = 0.0
    let forceZ = 0.0
    for (let zone of Object.keys(forces[id])) {
      forceX += forces[id][zone].x
      forceY += forces[id][zone].y
      forceZ += forces[id][zone].z
    }
    world
      .getBodyById(parseInt(id))
      .applyForce(
        new Vec3(
          forceX * manager.deltaTime,
          forceY * manager.deltaTime,
          forceZ * manager.deltaTime,
        ),
      )
  }

  if (socket != null) {
    // send camera vector and keys pressed
    let forward = new Vector3(500, 0, 0)
    forward.applyAxisAngle(new Vector3(0, 1, 0), manager.yaw)

    let keys = Array.from(manager.pressedKeys)
    let message = { keys, forwardXZ: [forward.x, forward.z] }
    socket.emit('input', message)
  }

  if (playerBody != null) {
    manager.updatePlayer(playerBody)
  }
  manager.render()
  window.requestAnimationFrame(tick)
}

tick()
manager.render()

window.addEventListener('resize', () => {
  manager.resize()
})
