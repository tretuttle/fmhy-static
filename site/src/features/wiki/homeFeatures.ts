// Types for the home feature cards.
//
// The cards themselves used to be a hand-copied table here — 13 entries with
// their lucide svg primitives transcribed by hand from upstream's index.md.
// They are now generated into generated/home.json from that same file on every
// content sync (see scripts/wiki/upstream.ts), so an upstream card edit lands
// automatically instead of waiting for someone to notice the drift.

export type LucidePrimitive =
  | { type: 'path'; d: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { type: 'circle'; cx: number; cy: number; r: number }

export type HomeFeature = {
  title: string
  link: string
  details: string
  color: string
  paths: LucidePrimitive[]
}
