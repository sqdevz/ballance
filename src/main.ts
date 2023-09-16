import './style.css'
import worldConfig from './world.json'

import * as THREE from 'three'
import * as dat from 'lil-gui'

import * as CANNON from 'cannon-es'
import CannonUtils from './cannonUtils'
import CannonDebugRenderer from './cannonDebugRenderer'

// config: different maps, arbitrary 3d shapes
// ball, box, cylinder
// player spawn (loc)
// static/dynamic/force/lava
// D.O.O.R.S

const sizes = { width: window.innerWidth, height: window.innerHeight }
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
camera.position.set(3, 3, 3)
camera.lookAt(new THREE.Vector3(0, 0, 0))

const canvas: HTMLCanvasElement = document.querySelector('canvas.webgl') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({ canvas })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)

const scene = new THREE.Scene()

// const geometry = new THREE.BoxGeometry(1, 1, 1)
// const material = new THREE.MeshPhongMaterial({ color: 0x006699 })
// const mesh = new THREE.Mesh(geometry, material)
// mesh.position.y = 0.5
// mesh.castShadow = true
// scene.add(mesh)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(0, 1, 1)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
directionalLight.shadow.radius = 5
scene.add(directionalLight)


const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

// HACK: list of update functions
const updaters: (() => void)[] = []

function initializeEntity(entity) {
    switch (entity.type) {
        case 'Ballance$PlayerSpawn':
            break;
        case 'Ballance$WorldObject':
            const normalMaterial = new THREE.MeshNormalMaterial()
            const mass = entity.behaviour === 'static' ? 0.0 : 1.0
            switch (entity.shape.type) {
                case 'Ballance$BoxShape':
                    const cubeGeometry = new THREE.BoxGeometry(
                        entity.shape.halfExtents.x * 2,
                        entity.shape.halfExtents.y * 2,
                        entity.shape.halfExtents.z * 2,
                    )
                    const cubeMesh = new THREE.Mesh(cubeGeometry, normalMaterial)
                    cubeMesh.position.x = entity.position.x
                    cubeMesh.position.y = entity.position.y
                    cubeMesh.position.z = entity.position.z
                    cubeMesh.rotation.x = entity.eulerRotation.x
                    cubeMesh.rotation.y = entity.eulerRotation.y
                    cubeMesh.rotation.z = entity.eulerRotation.z
                    cubeMesh.castShadow = true
                    scene.add(cubeMesh)
                    const cubeShape = new CANNON.Box(new CANNON.Vec3(
                        entity.shape.halfExtents.x,
                        entity.shape.halfExtents.y,
                        entity.shape.halfExtents.z,
                    ))
                    const cubeBody = new CANNON.Body({ mass })
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
                        cubeMesh.position.set(cubeBody.position.x, cubeBody.position.y, cubeBody.position.z)
                        cubeMesh.quaternion.set(
                            cubeBody.quaternion.x,
                            cubeBody.quaternion.y,
                            cubeBody.quaternion.z,
                            cubeBody.quaternion.w
                        )
                    })
                    break
                case 'Ballance$CylinderShape':
                    const cylinderGeometry = new THREE.CylinderGeometry(
                        entity.shape.radius,
                        entity.shape.radius,
                        entity.shape.halfLength * 2,
                        16,
                    )
                    const cylinderMesh = new THREE.Mesh(cylinderGeometry, normalMaterial)
                    cylinderMesh.position.x = entity.position.x
                    cylinderMesh.position.y = entity.position.y
                    cylinderMesh.position.z = entity.position.z
                    cylinderMesh.rotation.x = entity.eulerRotation.x
                    cylinderMesh.rotation.y = entity.eulerRotation.y
                    cylinderMesh.rotation.z = entity.eulerRotation.z
                    cylinderMesh.castShadow = true
                    scene.add(cylinderMesh)
                    const cylinderShape = new CANNON.Cylinder(
                        entity.shape.radius,
                        entity.shape.radius,
                        entity.shape.halfLength * 2,
                        16,
                    )
                    const cylinderBody = new CANNON.Body({ mass })
                    cylinderBody.addShape(cylinderShape, new CANNON.Vec3())
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
                    const sphereGeometry = new THREE.SphereGeometry(entity.shape.radius)
                    const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial)
                    sphereMesh.position.x = entity.position.x
                    sphereMesh.position.y = entity.position.y
                    sphereMesh.position.z = entity.position.z
                    sphereMesh.rotation.x = entity.eulerRotation.x
                    sphereMesh.rotation.y = entity.eulerRotation.y
                    sphereMesh.rotation.z = entity.eulerRotation.z
                    sphereMesh.castShadow = true
                    scene.add(sphereMesh)
                    const sphereShape = new CANNON.Sphere(entity.shape.radius)
                    const sphereBody = new CANNON.Body({ mass })
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
    }
}

for (let i = 0; i < worldConfig.entities.length; i++) {
    initializeEntity(worldConfig.entities[i])
}

const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

let time = Date.now()
const tick = () => {
    const currentTime = Date.now()
    const deltaTime = (currentTime - time) * 0.001
    time = currentTime

    world.step(Math.min(deltaTime, 0.1))
    cannonDebugRenderer.update()
    for (let i = 0; i < updaters.length; i++) updaters[i]()

    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}
tick()
renderer.render(scene, camera)

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    console.log(sizes)
})
