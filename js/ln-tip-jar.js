/**
 * <ln-tip-jar> — Web Component de microdonatius Lightning Network
 *
 * Atributs:
 *   ln-address       — Lightning Address (p. ex. "nom@walletofsatoshi.com")
 *   portfolio-url    — URL del portfolio (s'obre en nova pestanya)
 *   portfolio-label  — Text de l'enllaç al portfolio
 *   hover-text       — Text que apareix en hover del botó flotant
 *   button-position  — "left" | "right" (per defecte "right")
 *
 * Sense dependències externes, tret de qrcode.js (CDN, lazy load).
 * CSS 100% encapsulat via Shadow DOM.
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
   * Icona SVG de cafè (Font Awesome mug-hot simplificat)
   * ───────────────────────────────────────────────────────────────────────── */
  const COFFEE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0
      2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
  </svg>`;

  /* ─────────────────────────────────────────────────────────────────────────
   * Estils (Shadow DOM — totalment encapsulats)
   * ───────────────────────────────────────────────────────────────────────── */
  function buildStyles(pos) {
    const isLeft     = pos === 'left';
    const anchor     = isLeft ? 'left' : 'right';
    const modalOrig  = isLeft ? 'bottom left' : 'bottom right';

    return `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ── Botó flotant ───────────────────────────────────────────────── */
      .tip-btn {
        position: fixed;
        bottom: 24px;
        ${anchor}: 24px;
        z-index: 99999;

        display: flex;
        align-items: center;
        flex-direction: row;

        height: 52px;
        width: 52px;
        border-radius: 26px;
        padding: 0 14px;

        background: #1a1a1a;
        outline: 1px solid rgba(255, 255, 255, 0.15);
        border: none;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;

        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                    outline-color 0.2s ease;
      }

      .tip-btn:hover {
        width: 272px;
        outline-color: rgba(255, 255, 255, 0.3);
      }

      .tip-btn:focus-visible {
        outline: 2px solid #F7931A;
        outline-offset: 2px;
        width: 272px;
      }

      .tip-btn__icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        color: #cccccc;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tip-btn__icon svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .tip-btn__text {
        margin-left: 10px;
        color: #cccccc;
        font-size: 14px;
        white-space: nowrap;
        opacity: 0;
        flex-shrink: 0;
        transition: opacity 0.2s ease 0.14s;
        pointer-events: none;
      }

      .tip-btn:hover .tip-btn__text,
      .tip-btn:focus-visible .tip-btn__text {
        opacity: 1;
      }

      /* ── Modal ──────────────────────────────────────────────────────── */
      .modal {
        position: fixed;
        bottom: 88px;
        ${anchor}: 24px;
        z-index: 99998;

        width: 320px;
        background: #1a1a1a;
        border-radius: 12px;
        box-shadow:
          0 4px 6px  rgba(0, 0, 0, 0.35),
          0 12px 48px rgba(0, 0, 0, 0.65);
        outline: 1px solid rgba(255, 255, 255, 0.13);
        overflow: hidden;

        transform: scale(0.95);
        opacity: 0;
        pointer-events: none;
        transform-origin: ${modalOrig};
        transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                    opacity   0.22s ease;

        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }

      .modal.is-open {
        transform: scale(1);
        opacity: 1;
        pointer-events: auto;
      }

      /* Franja superior taronja */
      .modal__bar {
        height: 3px;
        background: #F7931A;
      }

      /* Capçalera */
      .modal__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        padding: 18px 16px 0 20px;
      }

      .modal__title {
        color: #ffffff;
        font-size: 17px;
        font-weight: 600;
        line-height: 1.3;
      }

      .modal__close {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.07);
        border: none;
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.55);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        font-family: inherit;
        transition: background 0.15s, color 0.15s;
        margin-top: 1px;
      }

      .modal__close:hover { background: rgba(255,255,255,0.15); color: #fff; }
      .modal__close:focus-visible { outline: 2px solid #F7931A; outline-offset: 2px; }

      /* Cos */
      .modal__body {
        padding: 14px 20px 20px;
      }

      .modal__desc {
        color: rgba(255, 255, 255, 0.58);
        font-size: 13px;
        line-height: 1.6;
        margin-bottom: 18px;
      }

      /* QR */
      .modal__qr {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 196px;
        margin-bottom: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 8px;
      }

      .modal__qr canvas,
      .modal__qr img { display: block; border-radius: 4px; }

      .qr-msg {
        color: rgba(255, 255, 255, 0.3);
        font-size: 13px;
        font-family: inherit;
      }

      /* Fila Lightning Address */
      .ln-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        margin-bottom: 16px;
        background: rgba(247, 147, 26, 0.07);
        border: 1px solid rgba(247, 147, 26, 0.22);
        border-radius: 8px;
      }

      .ln-address {
        flex: 1;
        min-width: 0;
        color: #F7931A;
        font-size: 12px;
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .copy-btn {
        flex-shrink: 0;
        background: transparent;
        border: 1px solid #F7931A;
        color: #F7931A;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        line-height: 1.4;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }

      .copy-btn:hover     { background: #F7931A; color: #000; }
      .copy-btn:focus-visible { outline: 2px solid #F7931A; outline-offset: 2px; }

      .copy-btn.is-copied {
        background: #22c55e;
        border-color: #22c55e;
        color: #000;
      }

      /* Separador */
      .modal__sep {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin-bottom: 16px;
      }

      /* Enllaç portfolio */
      .portfolio-link {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        color: rgba(255, 255, 255, 0.52);
        font-size: 13px;
        text-decoration: none;
        transition: color 0.15s;
      }

      .portfolio-link:hover       { color: #ffffff; }
      .portfolio-link:focus-visible {
        outline: 2px solid #F7931A;
        outline-offset: 2px;
        border-radius: 2px;
      }
    `;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Web Component
   * ───────────────────────────────────────────────────────────────────────── */
  class LnTipJar extends HTMLElement {

    static get observedAttributes() {
      return ['ln-address', 'portfolio-url', 'portfolio-label', 'hover-text', 'button-position'];
    }

    constructor() {
      super();
      this._root       = this.attachShadow({ mode: 'open' });
      this._isOpen     = false;
      this._qrDone     = false;
      this._onKey      = this._onKey.bind(this);
      this._onDocClick = this._onDocClick.bind(this);
    }

    /* ── Getters d'atributs ──────────────────────────────────────────── */
    get _lnAddress()      { return this.getAttribute('ln-address')      || ''; }
    get _portfolioUrl()   { return this.getAttribute('portfolio-url')   || '#'; }
    get _portfolioLabel() { return this.getAttribute('portfolio-label') || 'Veure més projectes'; }
    get _hoverText()      { return this.getAttribute('hover-text')      || 'Em convides a un cafè? 😊'; }
    get _pos()            { return this.getAttribute('button-position') === 'left' ? 'left' : 'right'; }

    /* ── Cicle de vida ───────────────────────────────────────────────── */
    connectedCallback() {
      this._build();
      document.addEventListener('keydown', this._onKey);
      document.addEventListener('click',   this._onDocClick, true);
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this._onKey);
      document.removeEventListener('click',   this._onDocClick, true);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal !== newVal && this._root.children.length) {
        const wasOpen = this._isOpen;
        this._build();
        if (wasOpen) this._openModal();
      }
    }

    /* ── Construcció del DOM intern ─────────────────────────────────── */
    _build() {
      const s = this._esc;

      this._root.innerHTML = `
        <style>${buildStyles(this._pos)}</style>

        <!-- Botó flotant -->
        <button
          id="btn"
          class="tip-btn"
          aria-label="Obrir widget de donació Lightning"
          aria-haspopup="dialog"
          aria-expanded="false"
        >
          <span class="tip-btn__icon">${COFFEE_SVG}</span>
          <span class="tip-btn__text" aria-hidden="true">${s(this._hoverText)}</span>
        </button>

        <!-- Modal -->
        <div
          id="modal"
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Widget de donació Lightning Network"
          aria-hidden="true"
        >
          <div class="modal__bar" aria-hidden="true"></div>

          <div class="modal__header">
            <h2 class="modal__title">Convida'm a un cafè ☕</h2>
            <button id="close-btn" class="modal__close" aria-label="Tancar el diàleg">✕</button>
          </div>

          <div class="modal__body">
            <p class="modal__desc">
              Si aquest projecte t'ha aportat valor, pots recolzar-lo amb un
              micropagament via Lightning. Sense intermediaris, sense comissions,
              directe al creador.
            </p>

            <div
              id="qr"
              class="modal__qr"
              aria-label="Codi QR de la Lightning Address"
            >
              <span class="qr-msg" aria-live="polite">Carregant…</span>
            </div>

            <div class="ln-row">
              <span
                class="ln-address"
                title="${s(this._lnAddress)}"
                aria-label="Lightning Address: ${s(this._lnAddress)}"
              >${s(this._lnAddress) || '<em style="opacity:.5">ln-address no configurada</em>'}</span>
              <button
                id="copy-btn"
                class="copy-btn"
                aria-label="Copiar Lightning Address al portapapers"
              >Copiar</button>
            </div>

            <div class="modal__sep" role="separator"></div>

            <a
              class="portfolio-link"
              href="${s(this._portfolioUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${s(this._portfolioLabel)}, obre en pestanya nova"
            >${s(this._portfolioLabel)} →</a>
          </div>
        </div>
      `;

      /* Listeners interns */
      this._q('btn').addEventListener('click', () => {
        this._isOpen ? this._closeModal() : this._openModal();
      });
      this._q('close-btn').addEventListener('click', () => this._closeModal());
      this._q('copy-btn').addEventListener('click',  () => this._copy());
    }

    /* ── Helpers de cerca ───────────────────────────────────────────── */
    _q(id) { return this._root.getElementById(id); }

    /* ── Obertura / Tancament del modal ─────────────────────────────── */
    _openModal() {
      const modal = this._q('modal');
      const btn   = this._q('btn');

      this._isOpen = true;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');

      requestAnimationFrame(() => this._q('close-btn').focus());

      if (!this._qrDone) this._loadQR();
    }

    _closeModal() {
      const modal = this._q('modal');
      const btn   = this._q('btn');

      this._isOpen = false;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }

    /* ── Handlers de document ───────────────────────────────────────── */
    _onKey(e) {
      if (e.key === 'Escape' && this._isOpen) {
        e.preventDefault();
        this._closeModal();
      }
    }

    _onDocClick(e) {
      if (!this._isOpen) return;
      const path  = e.composedPath ? e.composedPath() : [];
      const modal = this._q('modal');
      const btn   = this._q('btn');
      if (!path.includes(modal) && !path.includes(btn)) {
        this._closeModal();
      }
    }

    /* ── QR Code (lazy load des de CDN) ─────────────────────────────── */
    _loadQR() {
      if (typeof window.QRCode !== 'undefined') {
        this._renderQR();
        return;
      }
      const script  = document.createElement('script');
      script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = () => this._renderQR();
      script.onerror = () => {
        const c = this._q('qr');
        if (c) c.innerHTML = '<span class="qr-msg">No s\'ha pogut carregar el QR</span>';
      };
      document.head.appendChild(script);
    }

    _renderQR() {
      const container = this._q('qr');
      if (!container) return;

      if (!this._lnAddress) {
        container.innerHTML = '<span class="qr-msg">Configura ln-address per veure el QR</span>';
        return;
      }

      container.innerHTML = '';

      try {
        /* global QRCode */
        new QRCode(container, {
          text:         'lightning:' + this._lnAddress,
          width:        180,
          height:       180,
          colorDark:    '#000000',
          colorLight:   '#ffffff',
          correctLevel: QRCode.CorrectLevel.M,
        });
        this._qrDone = true;
      } catch (err) {
        container.innerHTML = '<span class="qr-msg">Error generant el QR</span>';
      }
    }

    /* ── Copiar al portapapers ───────────────────────────────────────── */
    _copy() {
      const btn = this._q('copy-btn');

      const feedback = () => {
        btn.textContent = 'Copiat!';
        btn.classList.add('is-copied');
        btn.setAttribute('aria-label', 'Adreça copiada!');
        setTimeout(() => {
          btn.textContent = 'Copiar';
          btn.classList.remove('is-copied');
          btn.setAttribute('aria-label', 'Copiar Lightning Address al portapapers');
        }, 2000);
      };

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(this._lnAddress)
          .then(feedback)
          .catch(() => this._fallbackCopy(feedback));
      } else {
        this._fallbackCopy(feedback);
      }
    }

    _fallbackCopy(cb) {
      const ta      = document.createElement('textarea');
      ta.value      = this._lnAddress;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) { /* silenciós */ }
      document.body.removeChild(ta);
      cb();
    }

    /* ── Escape HTML ────────────────────────────────────────────────── */
    get _esc() {
      return (str) => String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#x27;');
    }
  }

  if (!customElements.get('ln-tip-jar')) {
    customElements.define('ln-tip-jar', LnTipJar);
  }
})();
