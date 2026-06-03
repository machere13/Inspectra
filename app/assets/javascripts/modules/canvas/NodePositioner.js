(function() {
  window.NodePositioner = {
    calculatePositions: function(items, canvasWidth, canvasHeight) {
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.25;
      const radiusX = baseRadius * 1.5;
      const radiusY = baseRadius;

      const articleIndex = items.findIndex(item => 
        item.getAttribute('data-content-type') === 'article'
      );
      const centerIndex = articleIndex >= 0 ? articleIndex : 0;

      const nodes = [];

      const edgePadding = 24;

      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemWidth = rect.width || 200;
        const itemHeight = rect.height || 150;

        let x, y;

        if (index === centerIndex) {
          x = centerX;
          y = centerY;
        } else {
          const otherItems = items.filter((_, i) => i !== centerIndex);
          const otherIndex = index < centerIndex ? index : index - 1;
          const angle = (otherIndex / otherItems.length) * Math.PI * 2;
          const radiusVariationX = (index % 3) * 0.2;
          const radiusVariationY = (index % 3) * 0.2;
          const radiusXFinal = radiusX * (1 + radiusVariationX);
          const radiusYFinal = radiusY * (1 + radiusVariationY);

          const noiseX = (Math.random() - 0.5) * baseRadius * 0.3;
          const noiseY = (Math.random() - 0.5) * baseRadius * 0.3;

          x = centerX + Math.cos(angle) * radiusXFinal + noiseX;
          y = centerY + Math.sin(angle) * radiusYFinal + noiseY;
        }

        const halfW = itemWidth / 2 + edgePadding;
        const halfH = itemHeight / 2 + edgePadding;
        x = Math.max(halfW, Math.min(canvasWidth - halfW, x));
        y = Math.max(halfH, Math.min(canvasHeight - halfH, y));

        nodes.push({
          element: item,
          x: x,
          y: y,
          width: itemWidth,
          height: itemHeight
        });

        item.style.left = (x - itemWidth / 2) + 'px';
        item.style.top = (y - itemHeight / 2) + 'px';
        item.style.position = 'absolute';
      });

      return nodes;
    },

    updatePositions: function(nodes) {
      nodes.forEach(node => {
        if (node.element.style.display === 'none' || node.element.offsetParent === null) return;
        
        const rect = node.element.getBoundingClientRect();
        node.x = node.element.offsetLeft + (rect.width || 200) / 2;
        node.y = node.element.offsetTop + (rect.height || 150) / 2;
        node.width = rect.width || 200;
        node.height = rect.height || 150;
      });
    }
  };
})();

