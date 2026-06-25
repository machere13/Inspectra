(() => {
  const C = (window.GlobalMediaConstants && window.GlobalMediaConstants.video) || {};
  const state = { playlist: [], playlistTitles: [], currentIndex: 0 };
  let globalVideoInited = false;

  function setToggleIcon(btn, on) {
    const t = btn && btn.querySelector('.Q_ToggleIcon');
    if (t) t.classList.toggle('is-toggled', !!on);
  }

  const setPlaylist = window.createSetPlaylist
    ? window.createSetPlaylist(state)
    : (urls, index, titles) => {
        state.playlist = Array.isArray(urls) ? urls.filter(Boolean) : [];
        state.currentIndex = Math.max(0, Math.min(index | 0, Math.max(0, state.playlist.length - 1)));
        state.playlistTitles = Array.isArray(titles) ? titles.slice(0, state.playlist.length) : [];
        while (state.playlistTitles.length < state.playlist.length) state.playlistTitles.push('');
      };

  function getDefaultRect() {
    return {
      bottom: window.innerHeight - 80,
      width: 420,
      height: 320
    };
  }

  function loadSavedRect() {
    try {
      const raw = sessionStorage.getItem(C.STORAGE_KEY_RECT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveRect(panelEl) {
    if (!panelEl || panelEl.classList.contains('is-maximized')) return;
    try {
      const rect = panelEl.getBoundingClientRect();
      sessionStorage.setItem(C.STORAGE_KEY_RECT, JSON.stringify({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }));
    } catch (e) {}
  }

  function applyRect(panelEl, rect) {
    if (!panelEl || !rect) return;
    panelEl.style.right = '';
    panelEl.style.bottom = '';
    panelEl.style.left = `${rect.left != null ? rect.left : window.innerWidth - rect.width - 20}px`;
    panelEl.style.top = `${rect.top != null ? rect.top : (rect.bottom != null ? rect.bottom - rect.height : window.innerHeight - (rect.height || 320) - 80)}px`;
    panelEl.style.width = `${rect.width || 420}px`;
    panelEl.style.height = `${rect.height || 320}px`;
  }

  function persistVideoState() {
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    const panel = document.getElementById(C.GLOBAL_PANEL_ID);
    if (!container || !panel || container.getAttribute('aria-hidden') === 'true') return;
    const root = panel.querySelector('[data-js-video-player-body]');
    const video = root?.querySelector('[data-js-video-player-src]');
    if (!video || !video.src) return;
    try {
      sessionStorage.setItem(C.STORAGE_KEY_VIDEO_STATE, JSON.stringify({
        src: video.src,
        currentTime: video.currentTime,
        paused: video.paused,
        volume: video.volume,
        title: panel.getAttribute('data-video-title') || '',
        playlist: state.playlist,
        playlistTitles: state.playlistTitles,
        currentIndex: state.currentIndex
      }));
    } catch (e) {}
  }

  function loadSavedVideoState() {
    try {
      const raw = sessionStorage.getItem(C.STORAGE_KEY_VIDEO_STATE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function sameVideoUrl(a, b) {
    const s1 = (a || '').trim();
    const s2 = (b || '').trim();
    if (!s1 || !s2) return false;
    try {
      return new URL(s1, document.baseURI).href === new URL(s2, document.baseURI).href;
    } catch (e) {
      return s1 === s2;
    }
  }

  function applySavedVideoState(panel) {
    const loaded = loadSavedVideoState();
    if (!loaded || !loaded.src || !panel) return false;
    if (loaded.playlist && loaded.playlist.length) {
      state.playlist = loaded.playlist;
      state.playlistTitles = loaded.playlistTitles && loaded.playlistTitles.length ? loaded.playlistTitles : state.playlist.map(() => '');
      state.currentIndex = Math.max(0, Math.min(loaded.currentIndex | 0, state.playlist.length - 1));
    }
    const root = panel.querySelector('[data-js-video-player-body]');
    const video = root?.querySelector('[data-js-video-player-src]');
    const volumeInput = root?.querySelector('[data-js-volume-input]');
    const volumeFill = root?.querySelector('[data-js-volume-fill]');
    const titleEl = root?.querySelector('[data-js-video-player-title]');
    if (!video) return false;
    const currentHref = (video.currentSrc || video.src || '').trim();
    const same = sameVideoUrl(currentHref, loaded.src);
    if (!same) {
      video.src = loaded.src;
    }
    const vol = loaded.volume != null ? loaded.volume : 1;
    video.volume = vol;
    const t = loaded.currentTime != null ? loaded.currentTime : 0;
    if (Number.isFinite(t)) {
      if (!same || Math.abs(video.currentTime - t) > 0.25) {
        try {
          video.currentTime = t;
        } catch (err) {}
      }
    }
    if (loaded.title) panel.setAttribute('data-video-title', loaded.title);
    if (titleEl && loaded.title) titleEl.textContent = loaded.title;
    if (volumeInput) {
      volumeInput.value = String(Math.round(vol * 10));
      volumeInput.dispatchEvent(new Event('input'));
    }
    if (volumeFill) volumeFill.style.height = `${vol * 100}%`;
    if (!loaded.paused) video.play().catch(() => {});
    return true;
  }

  function isWeekPage() {
    const path = typeof window.location !== 'undefined' && window.location.pathname ? window.location.pathname : '';
    return /^\/weeks\//.test(path) && path.indexOf('/articles/') === -1 && path.indexOf('/admin/') === -1;
  }

  function doMinimizeToPreview(panelEl) {
    const root = panelEl.querySelector('[data-js-video-player-body]');
    const video = root?.querySelector('[data-js-video-player-src]');
    if (!video || !video.src) return;
    const url = video.src;
    const title = panelEl.getAttribute('data-video-title') || '';
    const currentTime = video.currentTime;
    const paused = video.paused;
    video.pause();
    persistVideoState();
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    if (container) {
      if (window.GlobalMediaPanel) {
        window.GlobalMediaPanel.hideGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE, transitionMs: C.GLOBAL_TRANSITION_MS });
        setTimeout(() => { panelEl.setAttribute('aria-hidden', 'true'); panelEl.style.display = 'none'; }, C.GLOBAL_TRANSITION_MS);
      } else {
        container.classList.remove('is-visible');
        setTimeout(() => {
          container.style.display = 'none';
          container.setAttribute('aria-hidden', 'true');
          panelEl.setAttribute('aria-hidden', 'true');
          panelEl.style.display = 'none';
          try { sessionStorage.removeItem(C.STORAGE_KEY_VISIBLE); } catch (err) {}
        }, C.GLOBAL_TRANSITION_MS);
      }
    }
    if (window.ContentPreview && typeof window.ContentPreview.openVideoPreview === 'function') {
      window.ContentPreview.openVideoPreview(url, { title, currentTime, paused });
    }
  }

  function initGlobalPanel(panelEl) {
    if (!panelEl || panelEl.getAttribute('data-video-global-inited') === 'true') return;
    panelEl.setAttribute('data-video-global-inited', 'true');

    if (window.W_ControlPanel) {
      window.W_ControlPanel.initPanelDrag(panelEl, { onDragEnd: () => saveRect(panelEl) });
      window.W_ControlPanel.initPanelResize(panelEl, { minW: 280, minH: 320, onResizeEnd: () => saveRect(panelEl) });
    }

    const closeBtn = panelEl.querySelector('[data-js-console-close]');
    closeBtn?.addEventListener('click', () => {
      persistVideoState();
      const root = panelEl.querySelector('[data-js-video-player-body]');
      const video = root?.querySelector('[data-js-video-player-src]');
      if (video) video.pause();
      const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
      if (!container) return;
      if (window.GlobalMediaPanel) {
        window.GlobalMediaPanel.hideGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE, transitionMs: C.GLOBAL_TRANSITION_MS });
        setTimeout(() => { panelEl.setAttribute('aria-hidden', 'true'); panelEl.style.display = 'none'; }, C.GLOBAL_TRANSITION_MS);
      } else {
        container.classList.remove('is-visible');
        setTimeout(() => {
          container.style.display = 'none';
          container.setAttribute('aria-hidden', 'true');
          panelEl.setAttribute('aria-hidden', 'true');
          panelEl.style.display = 'none';
          try { sessionStorage.removeItem(C.STORAGE_KEY_VISIBLE); } catch (e) {}
        }, C.GLOBAL_TRANSITION_MS);
      }
    });

    const maxBtn = panelEl.querySelector('[data-js-control-panel-mode]');
    maxBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (isWeekPage()) {
        doMinimizeToPreview(panelEl);
        return;
      }
      if (!document.fullscreenElement) {
        panelEl.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    });
  }

  function transferToGlobal(previewPanelEl, onClose) {
    const root = previewPanelEl?.querySelector('[data-js-video-player-body]');
    const video = root?.querySelector('[data-js-video-player-src]');
    const volumeInput = root?.querySelector('[data-js-volume-input]');
    if (!video) return;
    video.pause();
    const src = video.src || video.currentSrc || '';
    const currentTime = video.currentTime;
    const paused = video.paused;
    const vol = video.volume;
    const title = previewPanelEl.getAttribute('data-video-title') || '';

    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    const globalPanel = document.getElementById(C.GLOBAL_PANEL_ID);
    if (!container || !globalPanel) return;

    const globalRoot = globalPanel.querySelector('[data-js-video-player-body]');
    const globalVideo = globalRoot?.querySelector('[data-js-video-player-src]');
    const globalVolumeInput = globalRoot?.querySelector('[data-js-volume-input]');
    const globalVolumeFill = globalRoot?.querySelector('[data-js-volume-fill]');
    const globalTitleEl = globalRoot?.querySelector('[data-js-video-player-title]');
    if (!globalVideo) return;

    globalVideo.src = src;
    globalVideo.currentTime = currentTime;
    globalVideo.volume = vol;
    if (!paused && src) globalVideo.play().catch(() => {});
    globalPanel.setAttribute('data-video-title', title);
    if (globalTitleEl) globalTitleEl.textContent = title;
    if (globalVolumeInput) {
      globalVolumeInput.value = String(Math.round(vol * 10));
      globalVolumeInput.dispatchEvent(new Event('input'));
    }
    if (globalVolumeFill) globalVolumeFill.style.height = `${vol * 100}%`;

    const saved = loadSavedRect();
    applyRect(globalPanel, saved || getDefaultRect());
    globalPanel.removeAttribute('aria-hidden');
    globalPanel.style.display = 'flex';
    globalPanel.classList.add('is-visible');
    if (window.GlobalMediaPanel) {
      window.GlobalMediaPanel.showGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE });
      container.style.display = 'block';
    } else {
      container.style.display = 'block';
      container.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('is-visible')));
      try { sessionStorage.setItem(C.STORAGE_KEY_VISIBLE, '1'); } catch (e) {}
    }
    persistVideoState();

    initGlobalPanel(globalPanel);
    if (!globalVideoInited) {
      globalVideoInited = true;
      attach(container);
    }
    if (onClose) onClose();
  }

  function attach(container) {
    const root = container.querySelector('[data-js-video-player-body]');
    if (!root) return;
    const video = root.querySelector('[data-js-video-player-src]');
    const timeEl = root.querySelector('[data-js-video-player-time]');
    const durationEl = root.querySelector('[data-js-video-player-duration]');
    const progressFill = root.querySelector('[data-js-timeline-fill]');
    const seekInput = root.querySelector('[data-js-timeline-seek]');
    const timelineEl = root.querySelector('[data-js-timeline]');
    const volumeInput = root.querySelector('[data-js-volume-input]');
    const volumeFill = root.querySelector('[data-js-volume-fill]');
    const volumeWrap = root.querySelector('[data-js-video-player-volume]');
    const volumeToggle = root.querySelector('[data-js-video-player-volume-toggle]');
    const fullscreenBtn = root.querySelector('[data-js-video-player-fullscreen]');
    const titleEl = root.querySelector('[data-js-video-player-title]');
    const panel = root.closest('.W_ControlPanel');
    if (!video) return;

    if (titleEl && panel && panel.getAttribute('data-video-title')) {
      titleEl.textContent = panel.getAttribute('data-video-title');
    }

    const updateTime = () => { if (timeEl) timeEl.textContent = window.FormatTime(video.currentTime); };
    const updateDuration = () => { if (durationEl) durationEl.textContent = window.FormatTime(video.duration); };
    const updateProgress = () => {
      const p = video.duration ? (video.currentTime / video.duration) * 100 : 0;
      if (progressFill) progressFill.style.width = `${p}%`;
      if (seekInput) seekInput.value = p;
    };
    const volumeFromInput = () => {
      const raw = Number(volumeInput?.value);
      if (Number.isNaN(raw)) return 1;
      return raw / 10;
    };
    const updateVolumeFill = () => {
      if (volumeFill && volumeInput) {
        const vol = volumeFromInput();
        volumeFill.style.height = `${vol * 100}%`;
      }
    };

    function applySeek() {
      const p = Number(seekInput?.value) || 0;
      if (video.duration && Number.isFinite(video.duration)) {
        video.currentTime = (p / 100) * video.duration;
      }
      updateProgress();
    }

    video.addEventListener('timeupdate', () => { updateTime(); updateProgress(); });
    video.addEventListener('durationchange', () => { updateProgress(); updateDuration(); });
    video.addEventListener('loadedmetadata', () => { updateProgress(); updateDuration(); });
    if (container.id === C.GLOBAL_CONTAINER_ID) {
      let lastPersist = 0;
      video.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - lastPersist >= 1500) {
          lastPersist = now;
          persistVideoState();
        }
      });
    }
    function loadVideoTrack(index) {
      if (!state.playlist.length || index < 0 || index >= state.playlist.length) return;
      state.currentIndex = index;
      const url = state.playlist[index];
      const title = state.playlistTitles[index] || '';
      if (panel) panel.setAttribute('data-video-title', title);
      if (titleEl) titleEl.textContent = title;
      video.src = url;
      video.load();
      video.addEventListener('loadeddata', () => { video.play().catch(() => {}); }, { once: true });
      if (container.id === C.GLOBAL_CONTAINER_ID) persistVideoState();
    }

    const prevBtn = root.querySelector('[data-js-video-player-prev]');
    const nextBtn = root.querySelector('[data-js-video-player-next]');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.currentIndex > 0) loadVideoTrack(state.currentIndex - 1);
        else if (video.currentTime > 3) {
          video.currentTime = 0;
          updateProgress();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.currentIndex < state.playlist.length - 1) loadVideoTrack(state.currentIndex + 1);
      });
    }

    root.querySelectorAll('[data-js-video-player-play]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      });
    });
    video.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
    const playBtns = root.querySelectorAll('[data-js-video-player-play]');
    const syncPlayIcon = () => playBtns.forEach((b) => setToggleIcon(b, !video.paused));
    video.addEventListener('play', syncPlayIcon);
    video.addEventListener('pause', syncPlayIcon);
    syncPlayIcon();

    if (seekInput) {
      seekInput.addEventListener('input', applySeek);
      seekInput.addEventListener('change', applySeek);
    }
    if (timelineEl && seekInput) {
      timelineEl.addEventListener('click', (e) => {
        if (e.target === seekInput || seekInput.contains(e.target)) return;
        const rect = timelineEl.getBoundingClientRect();
        if (rect.width <= 0) return;
        const p = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        seekInput.value = p;
        applySeek();
      });
    }

    const syncMuteIcon = () => setToggleIcon(volumeToggle, video.muted || video.volume === 0);
    if (volumeToggle) {
      volumeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
      });
    }
    video.addEventListener('volumechange', syncMuteIcon);
    syncMuteIcon();
    if (volumeInput) {
      let vol = 1;
      if (container.id === C.GLOBAL_CONTAINER_ID) {
        const saved = loadSavedVideoState();
        if (saved && saved.volume != null) vol = Math.max(0, Math.min(1, saved.volume));
      }
      video.volume = vol;
      volumeInput.value = String(Math.round(vol * 10));
      volumeInput.addEventListener('input', () => {
        video.volume = volumeFromInput();
        if (video.muted && video.volume > 0) video.muted = false;
        updateVolumeFill();
        if (container.id === C.GLOBAL_CONTAINER_ID) persistVideoState();
      });
      volumeInput.addEventListener('change', () => {
        updateVolumeFill();
        if (container.id === C.GLOBAL_CONTAINER_ID) persistVideoState();
      });
      updateVolumeFill();
    }

    if (fullscreenBtn && panel) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          panel.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen();
        }
      });
      document.addEventListener('fullscreenchange', () => {
        const isFs = document.fullscreenElement === panel;
        panel.classList.toggle('is-fullscreen', isFs);
        setToggleIcon(fullscreenBtn, isFs);
      });
    }

    const panelEl = container.querySelector('.W_ControlPanel');
    const isGlobalContainer = container.id === C.GLOBAL_CONTAINER_ID;
    if (panelEl && !isGlobalContainer) {
      const closeBtn = panelEl.querySelector('[data-js-console-close]');
      const maxBtn = panelEl.querySelector('[data-js-control-panel-mode]');
      const isInPreview = panelEl.classList.contains('W_ControlPanel--in-preview');
      const onClosePreview = () => {
        if (window.ContentPreview && typeof window.ContentPreview.closePreview === 'function') {
          window.ContentPreview.closePreview();
        }
      };
      closeBtn?.addEventListener('click', () => {
        if (isInPreview) onClosePreview();
      });
      maxBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (isInPreview) {
          transferToGlobal(panelEl, onClosePreview);
          return;
        }
        panelEl.classList.toggle('is-maximized');
        maxBtn.setAttribute('aria-label', panelEl.classList.contains('is-maximized') ? 'Выйти из полноэкранного режима' : 'На весь экран');
      });
    }
  }

  function restoreGlobalVideo() {
    try {
      const visible = window.GlobalMediaPanel ? window.GlobalMediaPanel.isGlobalVisible(C.STORAGE_KEY_VISIBLE) : (sessionStorage.getItem(C.STORAGE_KEY_VISIBLE) === '1');
      const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
      const panel = document.getElementById(C.GLOBAL_PANEL_ID);
      if (!visible || !container || !panel) return;
      container.style.display = 'block';
      container.setAttribute('aria-hidden', 'false');
      panel.removeAttribute('aria-hidden');
      panel.style.display = 'flex';
      const saved = loadSavedRect();
      applyRect(panel, saved || getDefaultRect());
      const stateApplied = applySavedVideoState(panel);
      if (!stateApplied) {
        const root = panel.querySelector('[data-js-video-player-body]');
        const video = root?.querySelector('[data-js-video-player-src]');
        if (video?.src) video.load();
      }
      initGlobalPanel(panel);
      globalVideoInited = true;
      attach(container);
      if (window.GlobalMediaPanel) {
        window.GlobalMediaPanel.showGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE });
        container.style.display = 'block';
      } else requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('is-visible')));
    } catch (e) {}
  }

  window.O_VideoPlayer = {
    attach,
    restoreGlobalVideo,
    setPlaylist
  };

  if (window.DomUtils) {
    window.DomUtils.ready(restoreGlobalVideo);
    window.DomUtils.turboLoad(restoreGlobalVideo);
  } else {
    document.addEventListener('DOMContentLoaded', restoreGlobalVideo);
    document.addEventListener('turbo:load', restoreGlobalVideo);
  }
  document.addEventListener('turbo:before-visit', persistVideoState);
  document.addEventListener('turbo:before-cache', persistVideoState);
})();
