import { useUserScheme } from '@vxrn/color-scheme'
import { flushSync } from 'react-dom'

import {
  CheckThinIcon,
  MoonDuotoneIcon,
  MoonStarsDuotoneIcon,
  SunDuotoneIcon,
} from '~/icons/social/ThemeDuotoneIcons'

import { AMOLED_CLASS } from './themePrePaint'
import {
  ACCENT_NAMES,
  ACCENT_SWATCHES,
  PRESET_LABELS,
  PRESET_NAMES,
  accentLabel,
  useAccent,
  useAmoled,
  useThemeName,
} from './themeSettings'
import { pointFromPressEvent, revealThemeChange } from './themeTransition'

import type { AccentName, PresetName } from './themeSettings'
import type { CSSProperties, MouseEvent } from 'react'

// fmhy.net's AppearancePanel.vue + compact ColorPicker.vue: display mode rows
// (Light / Dark / AMOLED), then the color and preset swatches. one component
// for every placement — the header dropdown (>=1280px), the "…" extra menu
// (800-1279px) and the mobile nav sheet — like upstream's compact picker.
// plain markup styled by the .ap-* classes in app/root.css. selections never
// close the surrounding popup (their closeOnSelect defaults to false).

type Mode = 'light' | 'dark' | 'amoled'

const MODES: { id: Mode; label: string; Icon: typeof SunDuotoneIcon }[] = [
  { id: 'light', label: 'Light', Icon: SunDuotoneIcon },
  { id: 'dark', label: 'Dark', Icon: MoonDuotoneIcon },
  { id: 'amoled', label: 'AMOLED', Icon: MoonStarsDuotoneIcon },
]

// preset previews (each config's `preview`): catppuccin's circle logo, the
// halloween gradient, monochrome grey. monolith has none upstream, so it
// falls back to a brand-1 -> brand-2 gradient that follows the mode — that
// one lives in root.css (.ap-swatch-fill-monolith) so it needs no scheme read.
const PRESET_PREVIEWS: Partial<Record<PresetName, CSSProperties>> = {
  catppuccin: { backgroundImage: 'url(/catppuccin.png)' },
  halloween: { backgroundImage: 'linear-gradient(135deg, #EA580C 0%, #7C3AED 100%)' },
  monochrome: { backgroundColor: '#808080' },
}

function Swatch({
  label,
  active,
  onSelect,
  fillClassName,
  fillStyle,
}: {
  label: string
  active: boolean
  onSelect: () => void
  fillClassName?: string
  fillStyle?: CSSProperties
}) {
  return (
    <button
      type="button"
      className="ap-swatch"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span
        className={fillClassName ? `ap-swatch-fill ${fillClassName}` : 'ap-swatch-fill'}
        style={fillStyle}
      >
        {active && (
          <span className="ap-swatch-check">
            <CheckThinIcon size={10} />
          </span>
        )}
      </span>
    </button>
  )
}

function ColorPicker() {
  const [accent, setAccent] = useAccent()
  const [themeName, setThemeName] = useThemeName()

  // a color swatch is "default theme, this accent" — upstream's generated
  // color-<name> theme, which replaces any preset (see themeSettings.ts)
  const selectAccent = (name: AccentName) => {
    setAccent(name)
    setThemeName('default')
  }

  return (
    <div className="ap-colors">
      <div className="ap-section">
        <div className="ap-section-title">Color Themes</div>
        <div className="ap-swatches" role="group" aria-label="Color Themes">
          {ACCENT_NAMES.map((name) => (
            <Swatch
              key={name}
              label={accentLabel(name)}
              active={themeName === 'default' && accent === name}
              onSelect={() => selectAccent(name)}
              fillStyle={{ backgroundColor: ACCENT_SWATCHES[name] }}
            />
          ))}
        </div>
      </div>

      <div className="ap-section">
        <div className="ap-section-title">Theme Presets</div>
        <div className="ap-swatches" role="group" aria-label="Theme Presets">
          {PRESET_NAMES.map((name) => (
            <Swatch
              key={name}
              label={PRESET_LABELS[name]}
              active={themeName === name}
              onSelect={() => setThemeName(name)}
              fillClassName={`ap-swatch-fill-${name}`}
              fillStyle={PRESET_PREVIEWS[name]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppearancePanel() {
  const userScheme = useUserScheme()
  const [amoled, setAmoled] = useAmoled()

  const isDark = userScheme.value === 'dark'
  // amoled only means anything in dark mode (html.amoled.t_dark in root.css)
  const activeMode: Mode = isDark ? (amoled ? 'amoled' : 'dark') : 'light'

  // every switch runs inside the radial view-transition reveal from the click
  // point (fmhy.net themeTransition.ts). flushSync forces the scheme
  // provider's class flip to commit inside the transition callback so both
  // snapshots capture around it.
  const selectMode = (mode: Mode, event: MouseEvent) => {
    event.stopPropagation()
    const toDark = mode !== 'light'
    void revealThemeChange(pointFromPressEvent(event), toDark, () => {
      flushSync(() => {
        // persist the mode even when it matches what the OS resolved to —
        // upstream's setAppearance always saves it, ending OS-following
        setAmoled(mode === 'amoled')
        userScheme.set(toDark ? 'dark' : 'light')
      })
      // ThemeController toggles this from a passive effect that may land after
      // the new snapshot is captured — set it directly so the reveal shows it
      // (the later effect re-applies the same class, a no-op).
      document.documentElement.classList.toggle(AMOLED_CLASS, mode === 'amoled')
    })
  }

  return (
    <div className="ap-panel">
      <div className="ap-title">Appearance</div>
      <div role="group" aria-label="Display mode">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="ap-item"
            aria-pressed={activeMode === id}
            onClick={(event) => selectMode(id, event)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {activeMode === id && <CheckThinIcon size={16} />}
          </button>
        ))}
      </div>

      <div className="ap-divider" />

      <ColorPicker />
    </div>
  )
}
