import './style.css'

import $ from 'jquery'

import { SceneManager } from './SceneManager.ts'

import { Body, Box, Cylinder, Sphere, Vec3, World } from 'cannon-es'
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Mesh,
  MeshNormalMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'

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

var player: Body | null = null

function createDisplayOnlyMesh(entity, material) {
  switch (entity.shape.type) {
    case 'Ballance$BoxShape':
      const cubeGeometry = new BoxGeometry(
        entity.shape.halfExtents.x * 2,
        entity.shape.halfExtents.y * 2,
        entity.shape.halfExtents.z * 2,
      )
      const cubeMesh = new Mesh(cubeGeometry, material)
      cubeMesh.position.x = entity.position.x
      cubeMesh.position.y = entity.position.y
      cubeMesh.position.z = entity.position.z
      cubeMesh.rotation.x = entity.eulerRotation.x
      cubeMesh.rotation.y = entity.eulerRotation.y
      cubeMesh.rotation.z = entity.eulerRotation.z
      cubeMesh.castShadow = true
      manager.scene.add(cubeMesh)

      const cubeShape = new Box(
        new Vec3(
          entity.shape.halfExtents.x,
          entity.shape.halfExtents.y,
          entity.shape.halfExtents.z,
        ),
      )
      const cubeBody = new Body({ isTrigger: true })
      cubeBody.addShape(cubeShape)
      cubeBody.position.x = cubeMesh.position.x
      cubeBody.position.y = cubeMesh.position.y
      cubeBody.position.z = cubeMesh.position.z
      cubeBody.quaternion.set(
        cubeMesh.quaternion.x,
        cubeMesh.quaternion.y,
        cubeMesh.quaternion.z,
        cubeMesh.quaternion.w,
      )
      world.addBody(cubeBody)
      return cubeBody

    case 'Ballance$CylinderShape':
      const cylinderGeometry = new CylinderGeometry(
        entity.shape.radius,
        entity.shape.radius,
        entity.shape.halfLength * 2,
        16,
      )
      const cylinderMesh = new Mesh(cylinderGeometry, material)
      cylinderMesh.position.x = entity.position.x
      cylinderMesh.position.y = entity.position.y
      cylinderMesh.position.z = entity.position.z
      cylinderMesh.rotation.x = entity.eulerRotation.x
      cylinderMesh.rotation.y = entity.eulerRotation.y
      cylinderMesh.rotation.z = entity.eulerRotation.z
      cylinderMesh.castShadow = true
      manager.scene.add(cylinderMesh)

      const cylinderShape = new Cylinder(
        entity.shape.radius,
        entity.shape.radius,
        entity.shape.halfLength * 2,
        16,
      )
      const cylinderBody = new Body({ isTrigger: true })
      cylinderBody.addShape(cylinderShape, new Vec3())
      cylinderBody.position.x = cylinderMesh.position.x
      cylinderBody.position.y = cylinderMesh.position.y
      cylinderBody.position.z = cylinderMesh.position.z
      cylinderBody.quaternion.set(
        cylinderMesh.quaternion.x,
        cylinderMesh.quaternion.y,
        cylinderMesh.quaternion.z,
        cylinderMesh.quaternion.w,
      )
      world.addBody(cylinderBody)
      return cylinderBody

    case 'Ballance$SphereShape':
      const sphereGeometry = new SphereGeometry(entity.shape.radius)
      const sphereMesh = new Mesh(sphereGeometry, material)
      sphereMesh.position.x = entity.position.x
      sphereMesh.position.y = entity.position.y
      sphereMesh.position.z = entity.position.z
      sphereMesh.rotation.x = entity.eulerRotation.x
      sphereMesh.rotation.y = entity.eulerRotation.y
      sphereMesh.rotation.z = entity.eulerRotation.z
      sphereMesh.castShadow = true
      manager.scene.add(sphereMesh)

      const sphereShape = new Sphere(entity.shape.radius)
      const sphereBody = new Body({ isTrigger: true })
      sphereBody.addShape(sphereShape)
      sphereBody.position.x = sphereMesh.position.x
      sphereBody.position.y = sphereMesh.position.y
      sphereBody.position.z = sphereMesh.position.z
      sphereBody.quaternion.set(
        sphereMesh.quaternion.x,
        sphereMesh.quaternion.y,
        sphereMesh.quaternion.z,
        sphereMesh.quaternion.w,
      )
      world.addBody(sphereBody)
      return sphereBody
  }
}

// forces to apply per time unit, as a Map<BodyId, Map<BodyId, Vec3>>
const forces = {}

const initializeEntity = (entity) => {
  switch (entity.type) {
    case 'Ballance$PlayerSpawn':
      const radius = 0.5
      const normalMaterial = new MeshNormalMaterial()
      const sphereGeometry = new SphereGeometry(radius)
      const sphereMesh = new Mesh(sphereGeometry, normalMaterial)
      sphereMesh.position.x = entity.position.x
      sphereMesh.position.y = entity.position.y
      sphereMesh.position.z = entity.position.z
      sphereMesh.castShadow = true
      manager.scene.add(sphereMesh)
      const sphereShape = new Sphere(radius)
      const sphereBody = new Body({ mass: 1.0 })
      sphereBody.addShape(sphereShape)
      sphereBody.position.x = sphereMesh.position.x
      sphereBody.position.y = sphereMesh.position.y
      sphereBody.position.z = sphereMesh.position.z
      world.addBody(sphereBody)
      updaters.push(() => {
        sphereMesh.position.set(
          sphereBody.position.x,
          sphereBody.position.y,
          sphereBody.position.z,
        )
        sphereMesh.quaternion.set(
          sphereBody.quaternion.x,
          sphereBody.quaternion.y,
          sphereBody.quaternion.z,
          sphereBody.quaternion.w,
        )
      })
      player = sphereBody
      break
    case 'Ballance$WorldObject':
      const mass = entity.behaviour === 'static' ? 0.0 : 1.0
      const color = new Color(entity.color.r, entity.color.g, entity.color.b)
      const material = new MeshPhongMaterial({ color })
      material.transparent = true
      material.opacity = entity.color.a
      switch (entity.shape.type) {
        case 'Ballance$BoxShape':
          const cubeGeometry = new BoxGeometry(
            entity.shape.halfExtents.x * 2,
            entity.shape.halfExtents.y * 2,
            entity.shape.halfExtents.z * 2,
          )
          const cubeMesh = new Mesh(cubeGeometry, material)
          cubeMesh.position.x = entity.position.x
          cubeMesh.position.y = entity.position.y
          cubeMesh.position.z = entity.position.z
          cubeMesh.rotation.x = entity.eulerRotation.x
          cubeMesh.rotation.y = entity.eulerRotation.y
          cubeMesh.rotation.z = entity.eulerRotation.z
          cubeMesh.castShadow = true
          manager.scene.add(cubeMesh)
          const cubeShape = new Box(
            new Vec3(
              entity.shape.halfExtents.x,
              entity.shape.halfExtents.y,
              entity.shape.halfExtents.z,
            ),
          )
          const cubeBody = new Body({ mass })
          cubeBody.addShape(cubeShape)
          cubeBody.position.x = cubeMesh.position.x
          cubeBody.position.y = cubeMesh.position.y
          cubeBody.position.z = cubeMesh.position.z
          cubeBody.quaternion.set(
            cubeMesh.quaternion.x,
            cubeMesh.quaternion.y,
            cubeMesh.quaternion.z,
            cubeMesh.quaternion.w,
          )
          world.addBody(cubeBody)
          updaters.push(() => {
            cubeMesh.position.set(
              cubeBody.position.x,
              cubeBody.position.y,
              cubeBody.position.z,
            )
            cubeMesh.quaternion.set(
              cubeBody.quaternion.x,
              cubeBody.quaternion.y,
              cubeBody.quaternion.z,
              cubeBody.quaternion.w,
            )
          })
          break
        case 'Ballance$CylinderShape':
          const cylinderGeometry = new CylinderGeometry(
            entity.shape.radius,
            entity.shape.radius,
            entity.shape.halfLength * 2,
            16,
          )
          const cylinderMesh = new Mesh(cylinderGeometry, material)
          cylinderMesh.position.x = entity.position.x
          cylinderMesh.position.y = entity.position.y
          cylinderMesh.position.z = entity.position.z
          cylinderMesh.rotation.x = entity.eulerRotation.x
          cylinderMesh.rotation.y = entity.eulerRotation.y
          cylinderMesh.rotation.z = entity.eulerRotation.z
          cylinderMesh.castShadow = true
          manager.scene.add(cylinderMesh)
          const cylinderShape = new Cylinder(
            entity.shape.radius,
            entity.shape.radius,
            entity.shape.halfLength * 2,
            16,
          )
          const cylinderBody = new Body({ mass })
          cylinderBody.addShape(cylinderShape, new Vec3())
          cylinderBody.position.x = cylinderMesh.position.x
          cylinderBody.position.y = cylinderMesh.position.y
          cylinderBody.position.z = cylinderMesh.position.z
          cylinderBody.quaternion.set(
            cylinderMesh.quaternion.x,
            cylinderMesh.quaternion.y,
            cylinderMesh.quaternion.z,
            cylinderMesh.quaternion.w,
          )
          world.addBody(cylinderBody)
          updaters.push(() => {
            cylinderMesh.position.set(
              cylinderBody.position.x,
              cylinderBody.position.y,
              cylinderBody.position.z,
            )
            cylinderMesh.quaternion.set(
              cylinderBody.quaternion.x,
              cylinderBody.quaternion.y,
              cylinderBody.quaternion.z,
              cylinderBody.quaternion.w,
            )
          })
          break
        case 'Ballance$SphereShape':
          const sphereGeometry = new SphereGeometry(entity.shape.radius)
          const sphereMesh = new Mesh(sphereGeometry, material)
          sphereMesh.position.x = entity.position.x
          sphereMesh.position.y = entity.position.y
          sphereMesh.position.z = entity.position.z
          sphereMesh.rotation.x = entity.eulerRotation.x
          sphereMesh.rotation.y = entity.eulerRotation.y
          sphereMesh.rotation.z = entity.eulerRotation.z
          sphereMesh.castShadow = true
          manager.scene.add(sphereMesh)
          const sphereShape = new Sphere(entity.shape.radius)
          const sphereBody = new Body({ mass })
          sphereBody.addShape(sphereShape)
          sphereBody.position.x = sphereMesh.position.x
          sphereBody.position.y = sphereMesh.position.y
          sphereBody.position.z = sphereMesh.position.z
          sphereBody.quaternion.set(
            sphereMesh.quaternion.x,
            sphereMesh.quaternion.y,
            sphereMesh.quaternion.z,
            sphereMesh.quaternion.w,
          )
          world.addBody(sphereBody)
          updaters.push(() => {
            sphereMesh.position.set(
              sphereBody.position.x,
              sphereBody.position.y,
              sphereBody.position.z,
            )
            sphereMesh.quaternion.set(
              sphereBody.quaternion.x,
              sphereBody.quaternion.y,
              sphereBody.quaternion.z,
              sphereBody.quaternion.w,
            )
          })
          break
      }
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
          if (event.body == player) {
            alert('You Win! Please Refresh')
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
          if (event.body == player) {
            alert('You Lose! Please Refresh')
          }
        })
      }
      break
  }
}

function initializeLevel(worldConfig) {
  for (let i = 0; i < worldConfig.entities.length; i++) {
    initializeEntity(worldConfig.entities[i])
  }
}

let jsonPath = 'world.json'
const hashLocation = window.location.hash
if (hashLocation.startsWith('#')) {
  jsonPath = hashLocation.substring(1) + '.json'
}

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
      .getBodyById(id)
      .applyForce(
        new Vec3(
          forceX * manager.deltaTime,
          forceY * manager.deltaTime,
          forceZ * manager.deltaTime,
        ),
      )
  }

  if (player != null) {
    manager.updatePlayer(player)
  }
  manager.render()
  window.requestAnimationFrame(tick)
}

tick()
manager.render()

window.addEventListener('resize', () => {
  manager.resize()
})
