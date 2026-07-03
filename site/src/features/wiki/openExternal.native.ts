import { Linking } from 'react-native'

// native half of the platform fork (openExternal.ts): hand the url to the OS
export function openExternal(url: string) {
  Linking.openURL(url).catch(() => {
    // unsupported scheme or no handler — nothing sensible to do
  })
}
