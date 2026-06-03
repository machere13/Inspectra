(function () {
  const TOAST_SELECTOR   = '.M_ToastInteractive';
  const TOAST_OPEN_ATTR  = '[data-js-interactive-modal-open]';
  const MODAL_SELECTOR   = '[data-js-interactive-modal]';
  const MODAL_CANCEL_ID  = 'js-interactive-modal-cancel';
  const MODAL_CONTINUE_ID = 'js-interactive-modal-continue';
  const OVERLAY_SELECTOR = '#js-interactive-overlay';
  const OVERLAY_CLOSE    = '[data-js-interactive-overlay-close]';
  const OVERLAY_MAX      = '[data-js-interactive-overlay-maximize]';
  const TRANSITION_MS    = 280;

  let preMaxRect = null;

  function showToast() {
    const toast = document.querySelector(TOAST_SELECTOR);
    if (!toast) return;
    toast.style.display = 'flex';
    setTimeout(hideToast, 12000);
  }
  function hideToast() {
    const toast = document.querySelector(TOAST_SELECTOR);
    if (!toast) return;
    toast.classList.add('M_ToastInteractive--Hiding');
    setTimeout(() => {
      toast.style.display = 'none';
      toast.classList.remove('M_ToastInteractive--Hiding');
    }, 300);
  }

  function openModal() {
    const modal = document.querySelector(MODAL_SELECTOR);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const modal = document.querySelector(MODAL_SELECTOR);
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function centerOverlay(overlay) {
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    overlay.style.left = `${Math.max(0, (window.innerWidth - rect.width) / 2)}px`;
    overlay.style.top = `${Math.max(0, (window.innerHeight - rect.height) / 2)}px`;
    overlay.style.right = '';
    overlay.style.bottom = '';
  }
  function openOverlay() {
    const overlay = document.querySelector(OVERLAY_SELECTOR);
    if (!overlay) return;
    overlay.style.display = '';
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      centerOverlay(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    });
  }
  function closeOverlay() {
    const overlay = document.querySelector(OVERLAY_SELECTOR);
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
      if (overlay.classList.contains('is-maximized')) {
        overlay.classList.remove('is-maximized');
        restoreMaxIcon(overlay);
      }
      overlay.style.left = '';
      overlay.style.top = '';
      overlay.style.right = '';
      overlay.style.bottom = '';
      overlay.style.width = '';
      overlay.style.height = '';
      preMaxRect = null;
    }, TRANSITION_MS);
  }

  function setMaxIcon(btn, toAlt) {
    if (!btn) return;
    const img = btn.querySelector('.A_ControlButton-Icon img, .Q_Icon img, img');
    if (!img) return;
    const url = toAlt ? btn.dataset.iconAltUrl : btn.dataset.iconUrl;
    if (url) img.src = url;
  }
  function restoreMaxIcon(overlay) {
    const btn = overlay.querySelector(OVERLAY_MAX);
    if (!btn) return;
    btn.setAttribute('aria-label', 'На весь экран');
    setMaxIcon(btn, false);
  }
  function maximizeOverlay(overlay) {
    if (!overlay || overlay.classList.contains('is-maximized')) return;
    const r = overlay.getBoundingClientRect();
    preMaxRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    overlay.classList.add('is-maximizing');
    overlay.style.left = `${r.left}px`;
    overlay.style.top = `${r.top}px`;
    overlay.style.right = '';
    overlay.style.bottom = '';
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
    void overlay.offsetHeight;
    overlay.classList.remove('is-maximizing');
    overlay.classList.add('is-maximized');
    overlay.style.left = '';
    overlay.style.top = '';
    overlay.style.right = '';
    overlay.style.bottom = '';
    overlay.style.width = '';
    overlay.style.height = '';
    const btn = overlay.querySelector(OVERLAY_MAX);
    if (btn) {
      btn.setAttribute('aria-label', 'Свернуть');
      setMaxIcon(btn, true);
    }
  }
  function restoreOverlay(overlay) {
    if (!overlay || !overlay.classList.contains('is-maximized')) return;
    const r = overlay.getBoundingClientRect();
    overlay.classList.add('is-maximizing');
    overlay.style.left = `${r.left}px`;
    overlay.style.top = `${r.top}px`;
    overlay.style.right = '';
    overlay.style.bottom = '';
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
    overlay.classList.remove('is-maximized');
    void overlay.offsetHeight;
    overlay.classList.remove('is-maximizing');
    if (preMaxRect) {
      overlay.style.left = `${preMaxRect.left}px`;
      overlay.style.top = `${preMaxRect.top}px`;
      overlay.style.width = `${preMaxRect.width}px`;
      overlay.style.height = `${preMaxRect.height}px`;
    } else {
      overlay.style.width = '';
      overlay.style.height = '';
      centerOverlay(overlay);
    }
    restoreMaxIcon(overlay);
  }
  function toggleMaximize() {
    const overlay = document.querySelector(OVERLAY_SELECTOR);
    if (!overlay) return;
    if (overlay.classList.contains('is-maximized')) {
      restoreOverlay(overlay);
    } else {
      maximizeOverlay(overlay);
    }
  }

  function bindOverlay(overlay) {
    if (!overlay || overlay.dataset.interactiveOverlayReady === '1') return;
    overlay.dataset.interactiveOverlayReady = '1';

    overlay.querySelectorAll(OVERLAY_CLOSE).forEach((btn) => {
      btn.addEventListener('click', closeOverlay);
    });
    overlay.querySelectorAll(OVERLAY_MAX).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMaximize();
      });
    });

    if (window.W_ControlPanel) {
      window.W_ControlPanel.initPanelDrag(overlay, {
        ignoreSelector: '.W_ControlPanel-Header-Button'
      });
      window.W_ControlPanel.initPanelResize(overlay, {
        minW: 480,
        minH: 360,
        pad: 16,
        onResizeStart: (el) => {
          if (el.classList.contains('is-maximized')) restoreOverlay(el);
        }
      });
    }
  }

  function init() {
    const overlay = document.querySelector(OVERLAY_SELECTOR);
    if (overlay) bindOverlay(overlay);

    if (!window.__interactiveDelegated) {
      window.__interactiveDelegated = true;

      document.addEventListener('click', (e) => {
        if (e.target.closest(TOAST_OPEN_ATTR)) {
          e.preventDefault();
          hideToast();
          openModal();
          return;
        }
        if (e.target.closest('#' + MODAL_CANCEL_ID)) {
          e.preventDefault();
          closeModal();
          return;
        }
        if (e.target.closest('#' + MODAL_CONTINUE_ID)) {
          e.preventDefault();
          closeModal();
          openOverlay();
          return;
        }
        const modalRoot = document.querySelector(MODAL_SELECTOR);
        if (modalRoot && e.target === modalRoot) {
          closeModal();
          return;
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const ov = document.querySelector(OVERLAY_SELECTOR);
        if (ov && ov.getAttribute('aria-hidden') !== 'true') {
          closeOverlay();
          return;
        }
        const md = document.querySelector(MODAL_SELECTOR);
        if (md && md.getAttribute('aria-hidden') !== 'true') {
          closeModal();
        }
      });
    }

    if (document.querySelector(TOAST_SELECTOR)) {
      setTimeout(showToast, 1500);
    }
  }

  window.InteractiveToast = {
    show: showToast,
    hide: hideToast,
    openModal: openModal,
    closeModal: closeModal,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay
  };

  if (window.DomUtils) {
    window.DomUtils.ready(init);
    window.DomUtils.turboLoad(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
