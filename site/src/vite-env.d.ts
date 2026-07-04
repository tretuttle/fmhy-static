/// <reference types="vite/client" />

// Injected by vite.config.ts `define` at build time: short git rev (or
// 'dev' when built outside a git repo). Used in the footer for parity with
// fmhy.net's "Made with ... (rev: ...)" line.
declare const __GIT_REV__: string
