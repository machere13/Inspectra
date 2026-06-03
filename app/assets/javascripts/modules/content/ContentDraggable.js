(function() {
  const ContentDraggable = {
    makeDraggable: function(item) {
      const handle = item.querySelector('.M_ContentCard-Handle');
      if (!handle) return;
      const container = item.closest('.PageWeek-Content');
      if (!container) return;

      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      let dragging = false;
      let activePointerId = null;

      // На мобилке нативный скролл/жест перехватывал бы наш драг — блокируем
      // touch-поведение на хэндле, чтобы pointermove приходил без задержек.
      handle.style.touchAction = 'none';

      const onPointerMove = function(e) {
        if (!dragging || e.pointerId !== activePointerId) return;
        e.preventDefault();
        const dx = (e.clientX || 0) - startX;
        const dy = (e.clientY || 0) - startY;
        let newLeft = origLeft + dx;
        let newTop = origTop + dy;
        const contRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        newLeft = Math.max(0, Math.min(newLeft, contRect.width - itemRect.width));
        newTop = Math.max(0, Math.min(newTop, contRect.height - itemRect.height));
        item.style.left = newLeft + 'px';
        item.style.top = newTop + 'px';
      };

      const onPointerUp = function(e) {
        if (!dragging || (activePointerId !== null && e.pointerId !== activePointerId)) return;
        dragging = false;
        try { handle.releasePointerCapture(activePointerId); } catch (_) { /* noop */ }
        activePointerId = null;
        handle.removeEventListener('pointermove', onPointerMove, true);
        handle.removeEventListener('pointerup', onPointerUp, true);
        handle.removeEventListener('pointercancel', onPointerUp, true);
        document.body.style.userSelect = '';
      };

      const onPointerDown = function(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!e.isPrimary) return;
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        activePointerId = e.pointerId;
        const rect = item.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origLeft = rect.left - contRect.left;
        origTop = rect.top - contRect.top;
        try { handle.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        // Слушаем move/up на самом handle — благодаря pointer capture
        // события придут даже когда палец/курсор вышли за пределы.
        handle.addEventListener('pointermove', onPointerMove, true);
        handle.addEventListener('pointerup', onPointerUp, true);
        handle.addEventListener('pointercancel', onPointerUp, true);
        document.body.style.userSelect = 'none';
      };

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
    },

    init: function() {
      document.querySelectorAll('.PageWeek-Content .PageWeek-Content-Item').forEach(function(item) {
        if (item.querySelector('.M_ContentCard') || item.querySelector('.O_ArticleCard')) {
          item.style.position = item.style.position || 'absolute';
          this.makeDraggable(item);
        }
      }.bind(this));
    }
  };

  window.ContentDraggable = ContentDraggable;

  window.DomUtils.ready(function() {
    ContentDraggable.init();
  });
  window.DomUtils.turboLoad(function() {
    ContentDraggable.init();
  });
})();
