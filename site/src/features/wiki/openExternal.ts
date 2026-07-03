// web half of the platform fork (openExternal.native.ts): open the url in a
// new tab, severing the opener for safety
export function openExternal(url: string) {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}
