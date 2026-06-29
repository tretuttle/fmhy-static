// stub - expo-linking not used on web
export const createURL = (path: string) => path
export const parse = (url: string) => ({ path: url })
export const addEventListener = () => ({ remove: () => {} })
export const getInitialURL = async () => null
export const openURL = (url: string) => window.open(url, '_blank')
export const canOpenURL = async () => true
export default { createURL, parse, addEventListener, getInitialURL, openURL, canOpenURL }
