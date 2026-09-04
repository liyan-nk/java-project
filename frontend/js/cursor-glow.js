/**
 * Ambient Cursor Glow Controller for CampusHub
 * Tracks mouse cursor position with requestAnimationFrame throttling
 * and updates CSS custom properties for GPU-accelerated glow movement.
 * Automatically adapts to light/dark themes via CSS tokens.
 */

export function initCursorGlow() {
  // Desktop pointer check: skip on touch-only devices
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!isFinePointer.matches) {
    return;
  }

  // Ensure cursor glow element exists in DOM
  let glowEl = document.getElementById('cursor-glow');
  if (!glowEl) {
    glowEl = document.createElement('div');
    glowEl.id = 'cursor-glow';
    glowEl.setAttribute('aria-hidden', 'true');
    document.body.prepend(glowEl);
  }

  let mouseX = -9999;
  let mouseY = -9999;
  let isTicking = false;
  let hasMoved = false;

  function updateCursorPosition() {
    document.documentElement.style.setProperty('--cursor-x', `${mouseX}px`);
    document.documentElement.style.setProperty('--cursor-y', `${mouseY}px`);
    isTicking = false;
  }

  window.addEventListener(
    'mousemove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!hasMoved) {
        document.documentElement.classList.add('has-cursor');
        hasMoved = true;
      }

      if (!isTicking) {
        requestAnimationFrame(updateCursorPosition);
        isTicking = true;
      }
    },
    { passive: true }
  );

  document.addEventListener('mouseleave', () => {
    document.documentElement.classList.remove('has-cursor');
    hasMoved = false;
  });

  document.addEventListener('mouseenter', () => {
    if (hasMoved) {
      document.documentElement.classList.add('has-cursor');
    }
  });
}
