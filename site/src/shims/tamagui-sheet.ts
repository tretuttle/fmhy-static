// stub - sheet not used in this project
// provides minimal exports to satisfy imports from dialog/popover/select
import { View, styled } from '@tamagui/core'

const Noop = () => null
const NoopStyled = styled(View, { name: 'SheetStub' })

export const Sheet = Object.assign(Noop, {
  Frame: NoopStyled,
  Overlay: NoopStyled,
  Handle: NoopStyled,
  ScrollView: NoopStyled,
})
export const SheetController = Noop
export const Overlay = NoopStyled
export const SheetOverlay = NoopStyled
export const SheetFrame = NoopStyled
export const SheetHandle = NoopStyled
export const SheetScrollView = NoopStyled
export const createSheet = () => Sheet
export const useSheet = () => ({ open: false, setOpen: () => {} })
export const useSheetController = () => ({ open: false, setOpen: () => {} })
