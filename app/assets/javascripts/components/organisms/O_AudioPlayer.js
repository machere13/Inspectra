(() => {
  const C = (window.GlobalMediaConstants && window.GlobalMediaConstants.audio) || {};
  const state = { playlist: [], playlistTitles: [], currentIndex: 0 };
  let loopOne = false;

  function setToggleIcon(btn, on) {
    const t = btn && btn.querySelector('.Q_ToggleIcon');
    if (t) t.classList.toggle('is-toggled', !!on);
  }

  function setPlaylist(urls, index, titles) {
    if (window.createSetPlaylist) return window.createSetPlaylist(state, persistGlobalState)(urls, index, titles);
    state.playlist = Array.isArray(urls) ? urls.filter(Boolean) : [];
    state.currentIndex = Math.max(0, Math.min(index | 0, Math.max(0, state.playlist.length - 1)));
    state.playlistTitles = Array.isArray(titles) ? titles.slice(0, state.playlist.length) : [];
    while (state.playlistTitles.length < state.playlist.length) state.playlistTitles.push('');
    if (state.playlist.length > 0) persistGlobalState();
  }

  function updateGlobalTitle() {
    const bar = document.getElementById(C.GLOBAL_PANEL_ID);
    const el = bar?.querySelector('[data-js-audio-player-title]');
    if (el) el.textContent = state.playlistTitles[state.currentIndex] || '';
  }

  function openInPreview(url) {
    const template = document.getElementById('js-audio-player-template');
    if (!template || !template.firstElementChild) return null;
    if (state.playlist.length === 0 && url) {
      state.playlist = [url];
      state.currentIndex = 0;
    }
    const panel = template.firstElementChild.cloneNode(true);
    panel.removeAttribute('id');
    panel.style.display = '';
    panel.removeAttribute('aria-hidden');
    panel.classList.add('W_ControlPanel--in-preview');
    const audio = panel.querySelector('[data-js-audio-player-src]');
    if (audio) {
      audio.src = url || '';
      audio.load();
    }
    return panel;
  }

  function initPanel(panelEl, onClose, options) {
    if (!panelEl) return;
    const opts = options || {};
    const verticalOnly = opts.verticalOnly === true;

    const closeBtn = panelEl.querySelector('[data-js-console-close]');
    const maxBtn = panelEl.querySelector('[data-js-control-panel-mode]');
    closeBtn?.addEventListener('click', () => { if (onClose) onClose(); });

    maxBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (panelEl.classList.contains('W_ControlPanel--in-preview')) {
        transferInPreviewToGlobal(panelEl, onClose);
        return;
      }
      panelEl.classList.toggle('is-maximized');
      maxBtn.setAttribute('aria-label', panelEl.classList.contains('is-maximized') ? 'Выйти из полноэкранного режима' : 'На весь экран');
    });

    if (window.W_ControlPanel) {
      window.W_ControlPanel.initPanelDrag(panelEl, { verticalOnly });
      if (!verticalOnly) {
        window.W_ControlPanel.initPanelResize(panelEl, { minW: 280, minH: 200 });
      }
    }
  }

  let globalInited = false;

  function persistGlobalState() {
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    if (!container) return;
    const root = container.querySelector('[data-js-audio-player-body], .O_GlobalAudioPlayer');
    const audio = root?.querySelector('[data-js-audio-player-src]');
    try {
      if (state.playlist.length > 0) {
        const json = JSON.stringify(state.playlist);
        container.setAttribute(C.DATA_ATTR_PLAYLIST, json);
        container.setAttribute(C.DATA_ATTR_INDEX, String(state.currentIndex));
        if (state.playlistTitles.length) {
          const titlesJson = JSON.stringify(state.playlistTitles);
          container.setAttribute(C.DATA_ATTR_TITLES, titlesJson);
          sessionStorage.setItem(C.STORAGE_KEY_TITLES, titlesJson);
        }
        sessionStorage.setItem(C.STORAGE_KEY_PLAYLIST, json);
        sessionStorage.setItem(C.STORAGE_KEY_INDEX, String(state.currentIndex));
      }
      if (audio && audio.src) {
        container.setAttribute(C.DATA_ATTR_SRC, audio.src);
        container.setAttribute(C.DATA_ATTR_TIME, String(audio.currentTime));
        container.setAttribute(C.DATA_ATTR_PAUSED, audio.paused ? '1' : '0');
        container.setAttribute(C.DATA_ATTR_VOLUME, String(audio.volume));
        sessionStorage.setItem(C.STORAGE_KEY_SRC, audio.src);
        sessionStorage.setItem(C.STORAGE_KEY_TIME, String(audio.currentTime));
        sessionStorage.setItem(C.STORAGE_KEY_PAUSED, audio.paused ? '1' : '0');
        sessionStorage.setItem(C.STORAGE_KEY_VOLUME, String(audio.volume));
      }
    } catch (e) {}
  }

  function applyGlobalPosition(container, position) {
    if (!container) return;
    const bar = container.querySelector('.O_GlobalAudioPlayer');
    const isTop = position === 'top';
    container.classList.toggle('is-at-top', isTop);
    container.setAttribute('data-global-player-position', position || 'bottom');
    if (bar) bar.classList.toggle('is-at-top', isTop);
    try { sessionStorage.setItem(C.STORAGE_KEY_POSITION, isTop ? 'top' : 'bottom'); } catch (e) {}
  }

  const GLOBAL_DRAG_IGNORE = 'button, input, [type="range"], a, [role="button"], [data-js-audio-player-volume], [data-js-audio-player-close-global]';

  function bindGlobalDrag(container) {
    const bar = document.getElementById(C.GLOBAL_PANEL_ID);
    if (!container || !bar) return;
    let startY = 0;
    let startTransform = 0;
    let currentTransform = 0;
    bar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest(GLOBAL_DRAG_IGNORE)) return;
      e.preventDefault();
      bar.classList.add('is-dragging');
      container.classList.add('is-dragging');
      startY = e.clientY;
      startTransform = currentTransform;
      const onMove = (ev) => {
        currentTransform = startTransform + (ev.clientY - startY);
        container.style.transform = `translateY(${currentTransform}px)`;
      };
      const onUp = () => {
        bar.classList.remove('is-dragging');
        container.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        container.style.transform = '';
        currentTransform = 0;
        const rect = bar.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const position = centerY < window.innerHeight / 2 ? 'top' : 'bottom';
        applyGlobalPosition(container, position);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function saveGlobalAudioState() {
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    if (!container || container.style.display === 'none' || container.getAttribute('aria-hidden') === 'true') return;
    const root = container.querySelector('[data-js-audio-player-body], .O_GlobalAudioPlayer');
    const audio = root?.querySelector('[data-js-audio-player-src]');
    if (!audio || !audio.src) return;
    persistGlobalState();
  }

  function transferInPreviewToGlobal(panelEl, onClose) {
    const root = panelEl.querySelector('[data-js-audio-player-body], .O_AudioPlayer, .O_GlobalAudioPlayer');
    const audio = root?.querySelector('[data-js-audio-player-src]');
    const volumeInput = root?.querySelector('[data-js-volume-input]');
    if (!audio) return;
    audio.pause();
    const src = audio.src || audio.currentSrc || '';
    const currentTime = audio.currentTime;
    const paused = audio.paused;
    const vol = audio.volume;
    const sliderVal = volumeInput ? String(Math.round(vol * 10)) : '10';

    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    if (!container) return;
    const isHidden = container.getAttribute('aria-hidden') === 'true' || container.style.display === 'none';
    if (isHidden) {
      if (window.GlobalMediaPanel) window.GlobalMediaPanel.showGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE });
      else { container.style.display = ''; container.setAttribute('aria-hidden', 'false'); requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('is-visible'))); try { sessionStorage.setItem(C.STORAGE_KEY_VISIBLE, '1'); } catch (e) {} }
      initGlobal();
    }

    const globalBar = document.getElementById(C.GLOBAL_PANEL_ID);
    const globalRoot = globalBar?.querySelector('[data-js-audio-player-body]') || globalBar;
    const globalAudio = globalRoot?.querySelector('[data-js-audio-player-src]');
    const globalVolumeInput = globalRoot?.querySelector('[data-js-volume-input]');
    const globalVolumeFill = globalRoot?.querySelector('[data-js-volume-fill]');
    if (!globalAudio) return;
    globalAudio.src = src;
    globalAudio.currentTime = currentTime;
    globalAudio.volume = vol;
    if (globalVolumeInput) {
      globalVolumeInput.value = sliderVal;
      globalVolumeInput.dispatchEvent(new Event('input'));
    }
    if (globalVolumeFill) globalVolumeFill.style.height = `${vol * 100}%`;
    if (!paused && src) globalAudio.play().catch(() => {});

    persistGlobalState();
    if (onClose) onClose();
  }

  function initGlobal() {
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    const bar = document.getElementById(C.GLOBAL_PANEL_ID);
    if (!container || !bar) return;
    if (container.getAttribute('data-audio-inited') === 'true') return;
    container.setAttribute('data-audio-inited', 'true');
    globalInited = true;
    attach(container);
  }

  function toggleGlobal() {
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    const bar = document.getElementById(C.GLOBAL_PANEL_ID);
    if (!container || !bar) return;
    const isHidden = container.getAttribute('aria-hidden') === 'true' || container.style.display === 'none';
    if (isHidden) {
      let pos = '';
      try { pos = sessionStorage.getItem(C.STORAGE_KEY_POSITION) || 'bottom'; } catch (e) {}
      applyGlobalPosition(container, pos === 'top' ? 'top' : 'bottom');
      if (window.GlobalMediaPanel) window.GlobalMediaPanel.showGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE });
      else { container.style.display = ''; container.setAttribute('aria-hidden', 'false'); try { sessionStorage.setItem(C.STORAGE_KEY_VISIBLE, '1'); } catch (e) {} requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('is-visible'))); }
      initGlobal();
    } else {
      const root = container.querySelector('[data-js-audio-player-body], .O_GlobalAudioPlayer');
      const audio = root?.querySelector('[data-js-audio-player-src]');
      if (audio) audio.pause();
      if (window.GlobalMediaPanel) window.GlobalMediaPanel.hideGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE, transitionMs: C.GLOBAL_TRANSITION_MS });
      else { container.classList.remove('is-visible'); setTimeout(() => { container.style.display = 'none'; container.setAttribute('aria-hidden', 'true'); try { sessionStorage.removeItem(C.STORAGE_KEY_VISIBLE); } catch (e) {} }, C.GLOBAL_TRANSITION_MS); }
    }
  }

  function bindGlobalToggle() {
    document.querySelectorAll('[data-js-audio-player-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGlobal();
      });
    });
  }

  function attach(container, options) {
    const panelEl = container.querySelector('.W_ControlPanel');
    const root = container.querySelector('[data-js-audio-player-body], .O_AudioPlayer, .O_GlobalAudioPlayer');
    if (!root) return;
    const audio = root.querySelector('[data-js-audio-player-src]');
    const playBtn = root.querySelector('[data-js-audio-player-play]');
    const timeEl = root.querySelector('[data-js-audio-player-time]');
    const durationEl = root.querySelector('[data-js-audio-player-duration]');
    const progressFill = root.querySelector('[data-js-timeline-fill]');
    const seekInput = root.querySelector('[data-js-timeline-seek]');
    const volumeInput = root.querySelector('[data-js-volume-input]');
    const volumeFill = root.querySelector('[data-js-volume-fill]');
    if (!audio) return;

    const updateTime = () => { if (timeEl) timeEl.textContent = window.FormatTime(audio.currentTime); };
    const updateDuration = () => { if (durationEl) durationEl.textContent = window.FormatTime(audio.duration); };
    const updateProgress = () => {
      const p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
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
      if (audio.duration && Number.isFinite(audio.duration)) {
        audio.currentTime = (p / 100) * audio.duration;
      }
      updateProgress();
    }

    audio.addEventListener('timeupdate', () => { updateTime(); updateProgress(); });
    audio.addEventListener('durationchange', () => { updateProgress(); updateDuration(); });
    audio.addEventListener('loadedmetadata', () => { updateProgress(); updateDuration(); });
    let lastPersistTime = 0;
    if (container.id === C.GLOBAL_CONTAINER_ID) {
      audio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - lastPersistTime >= 1000) {
          lastPersistTime = now;
          persistGlobalState();
        }
      });
    }
    audio.addEventListener('ended', () => {
      if (loopOne) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    });
    playBtn?.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
    const syncPlayIcon = () => setToggleIcon(playBtn, !audio.paused);
    audio.addEventListener('play', syncPlayIcon);
    audio.addEventListener('pause', syncPlayIcon);
    syncPlayIcon();
    seekInput?.addEventListener('input', applySeek);
    seekInput?.addEventListener('change', applySeek);
    const timelineEl = root.querySelector('[data-js-timeline]');
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

    const prevBtn = root.querySelector('[data-js-audio-prev]');
    const nextBtn = root.querySelector('[data-js-audio-next]');
    const loopBtn = root.querySelector('[data-js-audio-loop]');
    function loadTrack(index) {
      const src = state.playlist[index];
      if (src == null || src === '') return;
      audio.src = src;
      audio.load();
      const playAfterLoad = () => {
        audio.play().catch(() => {});
      };
      audio.addEventListener('loadeddata', playAfterLoad, { once: true });
      audio.addEventListener('error', () => {}, { once: true });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
          updateProgress();
        } else if (state.currentIndex > 0) {
          state.currentIndex--;
          loadTrack(state.currentIndex);
          if (container.id === C.GLOBAL_CONTAINER_ID) {
            persistGlobalState();
            updateGlobalTitle();
          }
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (state.currentIndex < state.playlist.length - 1) {
          state.currentIndex++;
          loadTrack(state.currentIndex);
          if (container.id === C.GLOBAL_CONTAINER_ID) {
            persistGlobalState();
            updateGlobalTitle();
          }
        }
      });
    }
    if (loopBtn) {
      loopBtn.addEventListener('click', () => {
        loopOne = !loopOne;
        loopBtn.classList.toggle('is-active', loopOne);
      });
      loopBtn.classList.toggle('is-active', loopOne);
    }
    const volumeWrap = root.querySelector('[data-js-audio-player-volume]');
    const volumeToggle = root.querySelector('[data-js-audio-player-volume-toggle]');
    const syncMuteIcon = () => setToggleIcon(volumeToggle, audio.muted || audio.volume === 0);
    if (volumeToggle) {
      volumeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.muted = !audio.muted;
      });
    }
    audio.addEventListener('volumechange', syncMuteIcon);
    syncMuteIcon();
    if (volumeInput) {
      const savedVol = (container.id === C.GLOBAL_CONTAINER_ID)
        ? (parseFloat(sessionStorage.getItem(C.STORAGE_KEY_VOLUME)) || parseFloat(container.getAttribute(C.DATA_ATTR_VOLUME)) || 1)
        : 1;
      audio.volume = Math.max(0, Math.min(1, savedVol));
      volumeInput.value = String(Math.round(audio.volume * 10));
      volumeInput.addEventListener('input', () => {
        audio.volume = volumeFromInput();
        if (audio.muted && audio.volume > 0) audio.muted = false;
        updateVolumeFill();
        if (container.id === C.GLOBAL_CONTAINER_ID) persistGlobalState();
      });
      volumeInput.addEventListener('change', () => {
        updateVolumeFill();
        if (container.id === C.GLOBAL_CONTAINER_ID) persistGlobalState();
      });
      updateVolumeFill();
    }
    const closeGlobalBtn = root.querySelector('[data-js-audio-player-close-global]');
    if (closeGlobalBtn && container.id === C.GLOBAL_CONTAINER_ID) {
      closeGlobalBtn.addEventListener('click', () => { toggleGlobal(); });
    }
    if (container.id === C.GLOBAL_CONTAINER_ID) {
      bindGlobalDrag(container);
      updateGlobalTitle();
    }

    if (container.id === C.GLOBAL_CONTAINER_ID && root.querySelector('[data-js-audio-player-body]')) {
      if (state.playlist.length === 0 && audio.src) {
        state.playlist = [audio.src];
        state.currentIndex = 0;
      }
    } else if (state.playlist.length === 0 && audio.src) {
      state.playlist = [audio.src];
      state.currentIndex = 0;
    }

    if (panelEl) {
      const onClose = (options && options.onClose) || (() => {
        if (window.ContentPreview && typeof window.ContentPreview.closePreview === 'function') {
          window.ContentPreview.closePreview();
        }
      });
      initPanel(panelEl, onClose, options);
    }
  }

  window.O_AudioPlayer = {
    openInPreview,
    attach,
    setPlaylist,
    toggleGlobal,
    bindGlobalToggle
  };

  function resumeGlobalAudioAfterNavigation(container) {
    const root = container?.querySelector('[data-js-audio-player-body], .O_GlobalAudioPlayer');
    const audio = root?.querySelector('[data-js-audio-player-src]');
    if (!audio?.src) return;
    let pausedFlag = '1';
    try {
      pausedFlag = sessionStorage.getItem(C.STORAGE_KEY_PAUSED) || '1';
    } catch (e) {}
    if (pausedFlag === '1') {
      pausedFlag = container.getAttribute(C.DATA_ATTR_PAUSED) || '1';
    }
    if (pausedFlag !== '1') audio.play().catch(() => {});
  }

  function restoreGlobalPlayerAfterNavigate() {
    const visible = window.GlobalMediaPanel?.isGlobalVisible(C.STORAGE_KEY_VISIBLE);
    const container = document.getElementById(C.GLOBAL_CONTAINER_ID);
    if (!visible || !container) return;
    const isHidden = container.style.display === 'none' || container.getAttribute('aria-hidden') === 'true';
    if (isHidden) {
      let pos = 'bottom';
      try { pos = sessionStorage.getItem(C.STORAGE_KEY_POSITION) || 'bottom'; } catch (e) {}
      applyGlobalPosition(container, pos === 'top' ? 'top' : 'bottom');
      if (window.GlobalMediaPanel) window.GlobalMediaPanel.showGlobalContainer(container, { visibleKey: C.STORAGE_KEY_VISIBLE });
      else { container.style.display = ''; container.setAttribute('aria-hidden', 'false'); requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('is-visible'))); }
      if (container.getAttribute('data-audio-inited') !== 'true') {
        globalInited = false;
      }
      let savedSrc = '';
      let savedPlaylistJson = '';
      let savedTitlesJson = '';
      let savedIndex = '0';
      let savedTime = '0';
      let savedPaused = '1';
      let savedVolume = '1';
      savedPlaylistJson = container.getAttribute(C.DATA_ATTR_PLAYLIST) || '';
      savedIndex = container.getAttribute(C.DATA_ATTR_INDEX) || '';
      savedTitlesJson = container.getAttribute(C.DATA_ATTR_TITLES) || '';
      savedSrc = container.getAttribute(C.DATA_ATTR_SRC) || '';
      savedTime = container.getAttribute(C.DATA_ATTR_TIME) || '';
      savedPaused = container.getAttribute(C.DATA_ATTR_PAUSED) || '1';
      savedVolume = container.getAttribute(C.DATA_ATTR_VOLUME) || '';
      if (!savedPlaylistJson || !savedSrc) {
        try {
          if (!savedPlaylistJson) savedPlaylistJson = sessionStorage.getItem(C.STORAGE_KEY_PLAYLIST) || '';
          if (!savedIndex) savedIndex = sessionStorage.getItem(C.STORAGE_KEY_INDEX) || '0';
          if (!savedTitlesJson) savedTitlesJson = sessionStorage.getItem(C.STORAGE_KEY_TITLES) || '';
          if (!savedSrc) savedSrc = sessionStorage.getItem(C.STORAGE_KEY_SRC) || '';
          if (!savedTime) savedTime = sessionStorage.getItem(C.STORAGE_KEY_TIME) || '0';
          if (!savedPaused) savedPaused = sessionStorage.getItem(C.STORAGE_KEY_PAUSED) || '1';
          if (!savedVolume) savedVolume = sessionStorage.getItem(C.STORAGE_KEY_VOLUME) || '1';
        } catch (e) {}
      }
      if (!savedIndex) savedIndex = '0';
      if (!savedTime) savedTime = '0';
      if (!savedPaused) savedPaused = '1';
      if (!savedVolume) savedVolume = '1';
      let list = [];
      let titlesList = [];
      if (savedPlaylistJson) {
        try {
          list = JSON.parse(savedPlaylistJson);
          if (!Array.isArray(list)) list = [];
        } catch (e) {}
      }
      if (savedTitlesJson) {
        try {
          titlesList = JSON.parse(savedTitlesJson);
          if (!Array.isArray(titlesList)) titlesList = [];
        } catch (e) {}
      }
      if (list.length === 0 && savedSrc) list = [savedSrc];
      while (titlesList.length < list.length) titlesList.push('');
      const idx = Math.max(0, Math.min(parseInt(savedIndex, 10) || 0, Math.max(0, list.length - 1)));
      if (list.length > 0) {
        state.playlist = list;
        state.playlistTitles = titlesList;
        state.currentIndex = idx;
        const root = container.querySelector('[data-js-audio-player-body], .O_GlobalAudioPlayer');
        const audio = root?.querySelector('[data-js-audio-player-src]');
        const trackSrc = (state.playlist[state.currentIndex] || list[0] || '').trim();
        if (audio && trackSrc) {
          const time = Math.max(0, parseFloat(savedTime));
          const shouldPlay = savedPaused !== '1';
          const vol = Math.max(0, Math.min(1, parseFloat(savedVolume) || 1));
          let restored = false;
          const applyRestore = () => {
            if (restored) return;
            restored = true;
            if (Number.isFinite(time)) audio.currentTime = time;
            audio.volume = vol;
            const volInput = root?.querySelector('[data-js-volume-input]');
            const volFill = root?.querySelector('[data-js-volume-fill]');
            if (volInput) { volInput.value = String(Math.round(vol * 10)); volInput.dispatchEvent(new Event('input')); }
            if (volFill) volFill.style.height = `${vol * 100}%`;
            if (shouldPlay) audio.play().catch(() => {});
          };
          audio.addEventListener('loadedmetadata', applyRestore, { once: true });
          audio.addEventListener('loadeddata', applyRestore, { once: true });
          audio.addEventListener('canplay', applyRestore, { once: true });
          audio.src = trackSrc;
          audio.load();
          if (audio.readyState >= 2) applyRestore();
        }
      }
      initGlobal();
      updateGlobalTitle();
    } else {
      initGlobal();
      updateGlobalTitle();
    }
    resumeGlobalAudioAfterNavigation(container);
  }

  if (window.DomUtils) {
    window.DomUtils.ready(bindGlobalToggle);
    window.DomUtils.ready(restoreGlobalPlayerAfterNavigate);
    if (window.DomUtils.turboLoad) {
      window.DomUtils.turboLoad(bindGlobalToggle);
      window.DomUtils.turboLoad(restoreGlobalPlayerAfterNavigate);
    }
  } else {
    document.addEventListener('DOMContentLoaded', bindGlobalToggle);
    document.addEventListener('DOMContentLoaded', restoreGlobalPlayerAfterNavigate);
  }
  document.addEventListener('turbo:load', restoreGlobalPlayerAfterNavigate);
  document.addEventListener('turbo:before-visit', saveGlobalAudioState);
  document.addEventListener('turbo:before-cache', saveGlobalAudioState);
})();
