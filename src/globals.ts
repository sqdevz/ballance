// Constants used everywhere
import { World } from 'cannon-es'
import { SceneManager } from './SceneManager'
import { io } from 'socket.io-client'

export const canvas: HTMLCanvasElement = document.querySelector(
  'canvas.webgl',
) as HTMLCanvasElement

canvas.addEventListener('click', () => {
  canvas.requestPointerLock()
})

export const world = new World()
world.gravity.set(0, -9.82, 0)

export const manager: SceneManager = new SceneManager(canvas, world)

export const socket = io('ws://localhost:3000')
