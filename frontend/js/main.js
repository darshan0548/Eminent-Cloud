// Restart the hero demo animation on a loop so it stays lively on longer visits
document.addEventListener('DOMContentLoaded', () => {
  const demo = document.querySelector('.demo-card');
  if (!demo) return;

  const bubbles = demo.querySelectorAll('.bubble, .bubble-tag');

  function replay() {
    bubbles.forEach(el => {
      el.style.animation = 'none';
      // Force reflow so the animation can be re-triggered
      void el.offsetWidth;
      el.style.animation = '';
    });
  }

  // Loop the demo every 7 seconds
  setInterval(replay, 7000);
});
