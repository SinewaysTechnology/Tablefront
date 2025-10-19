"use client"

type OverlayEntry = { host: HTMLDivElement, observer: MutationObserver, text: string }

const containerToOverlay = new WeakMap<HTMLElement, OverlayEntry>()

function createAndMountHost (container: HTMLElement, text: string) {
  const uniqueId = Math.random().toString(36).slice(2)

  const host = document.createElement('div')
  host.setAttribute('data-rtf-wm', uniqueId)

  const hostStyle = [
    'position:absolute !important',
    'inset:0 !important',
    'pointer-events:none !important',
    'z-index:2147483647 !important',
    'contain:layout style paint !important',
    'mix-blend-mode:normal !important',
    'all:initial !important',
    'position:absolute !important',
    'top:0 !important',
    'left:0 !important',
    'right:0 !important',
    'bottom:0 !important',
    'display:block !important'
  ].join('; ')
  host.setAttribute('style', hostStyle)

  const shadow = host.attachShadow({ mode: 'closed' })

  const escapeForSvg = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const svgWidth = 320
  const svgHeight = 220
  const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<svg xmlns='http://www.w3.org/2000/svg' width='${svgWidth}' height='${svgHeight}' viewBox='0 0 ${svgWidth} ${svgHeight}'>\
  <defs>\
    <pattern id='p' width='${svgWidth}' height='${svgHeight}' patternUnits='userSpaceOnUse' patternTransform='rotate(-20)'>\
      <text x='0' y='${Math.floor(svgHeight / 2)}' font-size='28' font-family='system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif' fill='rgba(0,0,0,0.12)' font-weight='700'>${escapeForSvg(text)}</text>\
    </pattern>\
  </defs>\
  <rect width='100%' height='100%' fill='url(#p)'/>\
</svg>`
  const dataUrl = `url(\"data:image/svg+xml;utf8,${encodeURIComponent(svg)}\")`

  const styleEl = document.createElement('style')
  styleEl.textContent = `
    :host { all: initial !important; }
    .overlay { 
      position: absolute !important;
      inset: 0 !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0 20px, transparent 20px 40px), ${dataUrl} !important;
      background-repeat: repeat, repeat !important;
      background-size: auto, ${svgWidth}px ${svgHeight}px !important;
      background-position: 0 0, 0 0 !important;
      user-select: none !important;
    }
  `

  const overlay = document.createElement('div')
  overlay.className = 'overlay'

  // @ts-ignore closed shadow
  shadow.appendChild(styleEl)
  // @ts-ignore closed shadow
  shadow.appendChild(overlay)

  // Initial mount
  if (container.isConnected && !container.contains(host)) container.appendChild(host)

  // Minimal observer: if host is removed, re-append it
  const observer = new MutationObserver(() => {
    if (container.isConnected && !container.contains(host)) container.appendChild(host)
  })
  observer.observe(container, { childList: true })

  return { host, observer }
}

export function mountWatermarkTo (container: HTMLElement, text: string) {
  if (typeof document === 'undefined' || !container) return
  const existing = containerToOverlay.get(container)
  if (existing) {
    if (existing.text === (text || 'Unlicensed')) return
    unmountWatermarkFrom(container)
  }
  const { host, observer } = createAndMountHost(container, text || 'Unlicensed')
  containerToOverlay.set(container, { host, observer, text: text || 'Unlicensed' })
}

export function unmountWatermarkFrom (container: HTMLElement) {
  if (typeof document === 'undefined' || !container) return
  const entry = containerToOverlay.get(container)
  if (!entry) return
  try { entry.observer.disconnect() } catch {}
  try { entry.host.remove() } catch {}
  containerToOverlay.delete(container)
}

// No global mounting; watermark is scoped per table container

// watermark.ts is display-only; licensing was moved to src/licensing.ts

