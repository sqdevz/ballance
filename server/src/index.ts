// https://www.npmjs.com/package/socket.io
import { Body, Box, Cylinder, Sphere, Vec3, World } from 'cannon-es'

const fs = require('fs')
const server = require('http').createServer()
const io = require('socket.io')(server, {
  cors: {
    origin: "*"
  }
})


const world = new World()
world.gravity.set(0, -9.82, 0)

function setPositionAndRotation(entity, body: Body) {
  body.position.x = entity.position.x
  body.position.y = entity.position.y
  body.position.z = entity.position.z
  if (entity.eulerRotation !== undefined) {
    body.quaternion.setFromEuler(
      entity.eulerRotation.x,
      entity.eulerRotation.y,
      entity.eulerRotation.z,
    )
  }
}

function createSensorBody(entity) {
  switch (entity.shape.type) {
    case 'Ballance$BoxShape':
      const cubeShape = new Box(
        new Vec3(
          entity.shape.halfExtents.x,
          entity.shape.halfExtents.y,
          entity.shape.halfExtents.z,
        ),
      )
      const cubeBody = new Body({ isTrigger: true })
      cubeBody.addShape(cubeShape)
      setPositionAndRotation(entity, cubeBody)
      world.addBody(cubeBody)
      return cubeBody

    case 'Ballance$CylinderShape':
      const cylinderShape = new Cylinder(
        entity.shape.radius,
        entity.shape.radius,
        entity.shape.halfLength * 2,
        16,
      )
      const cylinderBody = new Body({ isTrigger: true })
      cylinderBody.addShape(cylinderShape, new Vec3())
      setPositionAndRotation(entity, cylinderBody)
      world.addBody(cylinderBody)
      return cylinderBody

    case 'Ballance$SphereShape':
      const sphereShape = new Sphere(entity.shape.radius)
      const sphereBody = new Body({ isTrigger: true })
      sphereBody.addShape(sphereShape)
      setPositionAndRotation(entity, sphereBody)
      world.addBody(sphereBody)
      return sphereBody
  }
}

// forces to apply per time unit, as a Map<BodyId, Map<BodyId, Vec3>>
const forces = {}

const unassignedPlayerBodyIds: Array<number> = []
const initializeEntity = (entity) => {
  switch (entity.type) {
    case 'Ballance$PlayerSpawn':
      const radius = 0.5
      const sphereShape = new Sphere(radius)
      const sphereBody = new Body({ mass: 1.0 })
      sphereBody.addShape(sphereShape)
      setPositionAndRotation(entity, sphereBody)
      world.addBody(sphereBody)
      unassignedPlayerBodyIds.push(sphereBody.id)
      break

    case 'Ballance$WorldObject':
      const mass = entity.behaviour === 'static' ? 0.0 : 1.0
      switch (entity.shape.type) {
        case 'Ballance$BoxShape':
          const cubeShape = new Box(
            new Vec3(
              entity.shape.halfExtents.x,
              entity.shape.halfExtents.y,
              entity.shape.halfExtents.z,
            ),
          )
          const cubeBody = new Body({ mass })
          cubeBody.addShape(cubeShape)
          setPositionAndRotation(entity, cubeBody)
          world.addBody(cubeBody)
          break

        case 'Ballance$CylinderShape':
          const cylinderShape = new Cylinder(
            entity.shape.radius,
            entity.shape.radius,
            entity.shape.halfLength * 2,
            16,
          )
          const cylinderBody = new Body({ mass })
          cylinderBody.addShape(cylinderShape)
          setPositionAndRotation(entity, cylinderBody)
          world.addBody(cylinderBody)
          break

        case 'Ballance$SphereShape':
          const sphereShape = new Sphere(entity.shape.radius)
          const sphereBody = new Body({ mass })
          sphereBody.addShape(sphereShape)
          setPositionAndRotation(entity, sphereBody)
          world.addBody(sphereBody)
          break
      }
      break
    case 'Ballance$ForceZone':
      {
        const forceBody = createSensorBody(entity)
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
        const body = createSensorBody(entity)
        body.addEventListener('collide', (event) => {
          // if (event.body == player) {
          // }
        })
      }
      break
    case 'Ballance$DeathZone':
      {
        const body = createSensorBody(entity)
        body.addEventListener('collide', (event) => {
          // if (event.body == player) {
          // }
        })
      }
      break
  }
}

const levelText = fs.readFileSync('levels/world.json')
const level = JSON.parse(levelText)
for (let entity of level.entities) {
  initializeEntity(entity)
}

class PerClientInformation {
  client: any
  physicsBodyId: number

  direction: Vec3 = new Vec3()
  pressedKeys: Set<string> = new Set()

  constructor(client: any, physicsBodyId: number) {
    this.client = client
    this.physicsBodyId = physicsBodyId
  }
}

const clientsById: Map<string, PerClientInformation> = new Map()

let time = null
const tick = () => {
  if (time === null) {
    time = Date.now();
  }

  const currentTime = Date.now()
  const deltaTime = (currentTime - time) * 0.001
  time = currentTime

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
          forceX * deltaTime,
          forceY * deltaTime,
          forceZ * deltaTime,
        ),
      )
  }

  for (const [_, info] of Object.entries(clientsById)) {
    let forward = new Vec3(
      info.direction.x * 500,
      info.direction.y * 500,
      info.direction.z * 500,
    )

    let player = world.getBodyById(info.physicsBodyId)
    if (info.pressedKeys.has('w')) {
      player.applyForce(
        new Vec3(forward.x * deltaTime, 0, forward.z * deltaTime),
      )
    }
    if (info.pressedKeys.has('s')) {
      player.applyForce(
        new Vec3(-forward.x * deltaTime, 0, -forward.z * deltaTime),
      )
    }
    if (info.pressedKeys.has('a')) {
      player.applyForce(
        new Vec3(forward.z * deltaTime, 0, -forward.x * deltaTime),
      )
    }
    if (info.pressedKeys.has('d')) {
      player.applyForce(
        new Vec3(-forward.z * deltaTime, 0, forward.x * deltaTime),
      )
    }
  }

  world.step(deltaTime)
  setTimeout(tick, 25)

  // send compressed world state to clients
  // 3 floats for position, 3 floats for rotation, 3 for velocity, 3 for angularVelocity
  // TODO compress quaternion for rotation
  // https://gafferongames.com/post/snapshot_compression/

  const float32 = new Float32Array(world.bodies.length * 13)
  for (let i = 0; i < world.bodies.length; i++) {
    let body: Body = world.bodies[i]
    let rotation = new Vec3()
    body.quaternion.toEuler(rotation)
    float32[i * 13 +  0] = body.position.x
    float32[i * 13 +  1] = body.position.y
    float32[i * 13 +  2] = body.position.z
    float32[i * 13 +  3] = body.quaternion.x
    float32[i * 13 +  4] = body.quaternion.y
    float32[i * 13 +  5] = body.quaternion.z
    float32[i * 13 +  6] = body.velocity.x
    float32[i * 13 +  7] = body.velocity.y
    float32[i * 13 +  8] = body.velocity.z
    float32[i * 13 +  9] = body.angularVelocity.x
    float32[i * 13 + 10] = body.angularVelocity.y
    float32[i * 13 + 11] = body.angularVelocity.z
    float32[i * 13 + 12] = body.quaternion.w

  }
  for (const [_, info] of Object.entries(clientsById)) {
    info.client.emit('world-state', float32)
  }
}

setTimeout(tick, 25)


io.on('connection', client => {
  console.log(['connected client', client.id])
  if (unassignedPlayerBodyIds.length === 0) {
    console.log('server full, cannot join', client.id)
    // TODO force player disconnect
    return
  }

  let physicsBodyId = unassignedPlayerBodyIds.pop()
  console.log('assigned body id', physicsBodyId, 'to', client.id)

  clientsById[client.id] = new PerClientInformation(client, physicsBodyId)
  client.on('ping', data => {
    console.log('received ping', data)
    client.emit('pong', data)
  })
  client.on('disconnect', () => {
    console.log('client disconnected')
    delete clientsById[client.id]
  })
  client.on('input', data => {
    const info: PerClientInformation = clientsById[client.id]
    info.pressedKeys = new Set(data.keys)
    info.direction.x = data.forwardXZ[0]
    info.direction.y = 0
    info.direction.z = data.forwardXZ[1]
    info.direction.normalize()
  })

  // if all player bodies are assigned, start the game!
  const shouldStartGame = unassignedPlayerBodyIds.length === 0
  if (shouldStartGame) {
    console.log('starting game')
    for (const [_, value] of Object.entries(clientsById)) {
      value.client.emit('start-game', { level, physicsBodyId: value.physicsBodyId })
    }
  }
})

server.listen(3000)
console.log('Server Started!')

