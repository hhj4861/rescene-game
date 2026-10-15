/* global window, document, Event */
// Runs only in the app's trusted, same-origin game page. Test this exact asset
// against the web build so the native shell and deployed game stay compatible.
(() => {
  if (window.resceneNativeApp) return true;
  window.resceneNativeApp = Object.freeze({
    back() {
      const app = document.getElementById('app');
      if (!app || ['home', 'loading'].includes(app.dataset.state)) return false;
      const home = document.querySelector('[data-exit-game], [data-leave]')
        || document.querySelector('[data-home]');
      if (!home) return false;
      home.click();
      return true;
    },
    pause() {
      // The web app deliberately ignores iframe-focus blurs. A native app
      // background transition must pause even if YouTube had focus.
      document.activeElement?.blur();
      window.dispatchEvent(new Event('blur'));
      return true;
    },
    resumeMedia() {
      // Existing web behavior resumes result music, but gameplay stays paused.
      window.dispatchEvent(new Event('focus'));
      return true;
    },
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[target="_blank"]');
    if (link) link.target = '_self';
  }, true);
  return true;
})();
