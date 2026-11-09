// port of fmhy.net's theme/components/Base64Dialog.vue — lazy-loaded by
// base64Links.tsx on the first rentry.co/FMHYB64 click
import { useState } from 'react'

import { ModalDialog } from '~/components/ModalDialog'

import { BASE64_DIALOG_PREFERENCE_KEY } from './base64Links'

// ph:info-duotone (@iconify-json/ph), frozen
const InfoDuotoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    className="b64-icon"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M144 176a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m88-48A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88m-92-32a12 12 0 1 0-12-12a12 12 0 0 0 12 12" />
  </svg>
)

export default function Base64Dialog({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const openLink = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(BASE64_DIALOG_PREFERENCE_KEY, 'true')
      } catch {
        // storage disabled: the dialog just keeps showing
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <ModalDialog
      onClose={onClose}
      labelledBy="b64-dialog-title"
      describedBy="b64-dialog-description"
      className="md-b64"
    >
      <h2 id="b64-dialog-title" className="md-title">
        <InfoDuotoneIcon />
        Base64 Link
      </h2>

      <p id="b64-dialog-description" className="b64-text">
        This link is Base64 encoded and needs to be decoded before use.
      </p>

      <div>
        <p className="b64-text b64-text-subtitle">To decode it, you can use:</p>
        <ul className="b64-list">
          <li>
            An online tool:{' '}
            <a
              href="https://www.base64decode.org/"
              target="_blank"
              rel="noreferrer"
              className="b64-link"
            >
              Base64 Decode
            </a>
          </li>
          <li>
            A userscript:{' '}
            <a
              href="https://greasyfork.org/en/scripts/485772-fmhy-base64-auto-decoder"
              target="_blank"
              rel="noreferrer"
              className="b64-link"
            >
              FMHY Base64 Auto Decoder
            </a>{' '}
            (using a{' '}
            <a href="/internet-tools#userscripts" target="_blank" className="b64-link">
              userscript manager
            </a>
            )
          </li>
        </ul>

        <p className="b64-footer-hint">
          For more options:{' '}
          <a href="/text-tools#encode-decode" target="_blank" className="b64-link">
            Base64 Decoders
          </a>
        </p>
      </div>

      <label className="b64-checkbox-group">
        <input
          type="checkbox"
          className="b64-checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
        />
        <span className="b64-checkbox-label">Don't show again</span>
      </label>

      <div className="b64-actions">
        <button type="button" className="b64-btn b64-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="b64-btn b64-btn-primary" onClick={openLink}>
          Open Link
        </button>
      </div>
    </ModalDialog>
  )
}
