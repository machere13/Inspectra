(function() {
  window.CanvasDrag = {
    isDragging: false,
    hasDragged: false,
    init: function(canvasContainer, canvasWidth, canvasHeight, viewportWidth, viewportHeight) {
      let isDragging = false;
      let hasDragged = false;
      let activePointerId = null;
      let startX = 0;
      let startY = 0;
      let transformX = -(canvasWidth - viewportWidth) / 2;
      let transformY = -(canvasHeight - viewportHeight) / 2;
      let velocityX = 0;
      let velocityY = 0;
      let lastTime = 0;
      let lastMoveX = 0;
      let lastMoveY = 0;
      let animationFrameId = null;
      const friction = 0.96;
      const dragThreshold = 5;
      const maxX = canvasWidth - viewportWidth;
      const maxY = canvasHeight - viewportHeight;

      canvasContainer.style.transform = `translate(${transformX}px, ${transformY}px)`;
      canvasContainer.style.touchAction = 'none';

      const updateTransform = function() {
        transformX = Math.max(-maxX, Math.min(0, transformX));
        transformY = Math.max(-maxY, Math.min(0, transformY));
        canvasContainer.style.transform = `translate(${transformX}px, ${transformY}px)`;
      };

      const animate = function(currentTime) {
        if (lastTime === 0) {
          lastTime = currentTime;
        }
        const deltaTime = (currentTime - lastTime) / 16;
        lastTime = currentTime;

        if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
          transformX += velocityX * deltaTime;
          transformY += velocityY * deltaTime;

          velocityX *= friction;
          velocityY *= friction;

          updateTransform();
          animationFrameId = requestAnimationFrame(animate);
        } else {
          velocityX = 0;
          velocityY = 0;
          animationFrameId = null;
        }
      };

      const onPointerMove = function(e) {
        if (!isDragging || e.pointerId !== activePointerId) return;

        const currentTime = performance.now();
        const dx = e.clientX - lastMoveX;
        const dy = e.clientY - lastMoveY;

        const totalDx = e.clientX - startX;
        const totalDy = e.clientY - startY;
        const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

        if (totalDistance > dragThreshold) {
          hasDragged = true;
          window.CanvasDrag.hasDragged = true;
        }

        transformX += dx;
        transformY += dy;
        updateTransform();

        const deltaTime = currentTime - (lastTime || currentTime);
        if (deltaTime > 0 && deltaTime < 100) {
          velocityX = dx / deltaTime * 16;
          velocityY = dy / deltaTime * 16;
        }

        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        lastTime = currentTime;
      };

      const onPointerUp = function(e) {
        if (!isDragging || (activePointerId !== null && e.pointerId !== activePointerId)) return;

        isDragging = false;
        activePointerId = null;
        canvasContainer.style.cursor = 'grab';

        window.CanvasDrag.isDragging = false;

        if (hasDragged) {
          setTimeout(function() {
            window.CanvasDrag.hasDragged = false;
          }, 300);
        } else {
          window.CanvasDrag.hasDragged = false;
        }

        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);

        if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
          lastTime = performance.now();
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      const onPointerDown = function(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!e.isPrimary) return;

        if (e.target.closest('.M_ContentCard-Handle') ||
            e.target.closest('.O_ArticleCard')) {
          return;
        }

        isDragging = true;
        hasDragged = false;
        activePointerId = e.pointerId;
        window.CanvasDrag.isDragging = true;
        window.CanvasDrag.hasDragged = false;
        startX = e.clientX;
        startY = e.clientY;
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        velocityX = 0;
        velocityY = 0;
        lastTime = 0;

        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }

        canvasContainer.style.cursor = 'grabbing';

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        const card = e.target.closest('.M_ContentCard');
        if (card) {
          card.dataset.dragStarted = 'true';
        }
      };

      canvasContainer.addEventListener('pointerdown', onPointerDown);

      return {
        updateTransform: updateTransform
      };
    }
  };
})();
