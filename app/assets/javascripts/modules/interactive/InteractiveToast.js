(function() {
  const InteractiveToast = {
    showToast: function(name) {
      const toast = document.querySelector('.M_ToastInteractive');
      if (!toast) return;

      if (name) toast.setAttribute('data-interactive-name', name);
      toast.style.display = 'flex';

      setTimeout(function() {
        InteractiveToast.hideToast();
      }, 12000);
    },

    hideToast: function() {
      const toast = document.querySelector('.M_ToastInteractive');
      if (!toast) return;

      toast.classList.add('M_ToastInteractive--Hiding');

      setTimeout(function() {
        toast.style.display = 'none';
        toast.classList.remove('M_ToastInteractive--Hiding');
      }, 300);
    },

    openModal: function(name, href) {
      const modal = document.querySelector('.O_ModalInteractive');
      if (!modal) return;

      const textElement = modal.querySelector('.O_ModalInteractive-Modal-Text');
      if (textElement) {
        textElement.textContent = name || modal.getAttribute('data-interactive-name') || 'Интерактив обнаружен!';
      }

      if (href) {
        modal.setAttribute('data-interactive-href', href);
      }

      modal.style.display = 'flex';
      InteractiveToast.hideToast();
    },

    closeModal: function() {
      const modal = document.querySelector('.O_ModalInteractive');
      if (!modal) return;
      modal.style.display = 'none';
    },

    goToInteractive: function() {
      const modal = document.querySelector('.O_ModalInteractive');
      if (!modal) return;
      const href = modal.getAttribute('data-interactive-href');
      if (href) {
        window.location.href = href;
      } else {
        InteractiveToast.closeModal();
      }
    },

    init: function() {
      const toast = document.querySelector('.M_ToastInteractive');
      if (toast) {
        toast.addEventListener('click', function() {
          const name = toast.getAttribute('data-interactive-name') || 'Интерактив обнаружен!';
          const href = toast.getAttribute('data-interactive-href');
          InteractiveToast.openModal(name, href);
        });
      }

      const modal = document.querySelector('.O_ModalInteractive');
      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) {
            InteractiveToast.closeModal();
          }
        });

        const buttons = modal.querySelectorAll('.A_Button, a.A_Button');
        buttons.forEach(function(button, index) {
          if (index === 0) {
            button.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              InteractiveToast.closeModal();
            });
          }
          if (index === 1) {
            const isLink = button.tagName === 'A' && button.getAttribute('href');
            if (!isLink) {
              button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                InteractiveToast.goToInteractive();
              });
            }
          }
        });
      }

      this.checkForInteractive();
    },

    checkForInteractive: function() {
      const toast = document.querySelector('.M_ToastInteractive');
      if (!toast) return;

      setTimeout(function() {
        const name = toast.getAttribute('data-interactive-name') || 'Интерактив';
        InteractiveToast.showToast(name);
      }, 1500);
    }
  };

  window.InteractiveToast = InteractiveToast;
  window.ModalInteractive = {
    close: function() {
      InteractiveToast.closeModal();
    }
  };

  window.DomUtils.ready(function() {
    InteractiveToast.init();
  });

  window.DomUtils.turboLoad(function() {
    InteractiveToast.init();
  });
})();
