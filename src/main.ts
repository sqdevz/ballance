import './style.css'

import * as THREE from 'three'
import * as dat from 'lil-gui'

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

const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshPhongMaterial({ color: 0x006699 })
const mesh = new THREE.Mesh(geometry, material)
mesh.position.y = 0.5
mesh.castShadow = true
scene.add(mesh)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(0, 1, 1)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
directionalLight.shadow.radius = 5
scene.add(directionalLight)

let time = Date.now()
const tick = () => {
    const currentTime = Date.now()
    const deltaTime = (currentTime - time) * 0.001
    time = currentTime
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
