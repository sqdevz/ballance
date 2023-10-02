// Gloal window level listeners

import { manager } from './globals'

/**
 * Assign any listeners that are used on startup
 */
export const initialiseGlobalListeners = () => {
  window.addEventListener('resize', () => {
    manager.resize()
  })

  window.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      manager.pressedKeys.add(event.key)
    },
    false,
  )
  window.addEventListener(
    'keyup',
    (event: KeyboardEvent) => {
      manager.pressedKeys.delete(event.key)
    },
    false,
  )
}
