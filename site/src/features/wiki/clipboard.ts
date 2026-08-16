// TODO(native): navigator.clipboard is undefined on react-native —
// the try/catch degrades to `false` instead of crashing, but copy is silently
// broken. fork to expo-clipboard.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
