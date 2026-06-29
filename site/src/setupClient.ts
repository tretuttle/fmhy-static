// Minimal client setup for tribute site
import { setupDev } from 'tamagui'

if (process.env.NODE_ENV === 'development') {
  setupDev({
    visualizer: true,
  })
}
