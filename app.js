// Pinned-post carousel (swipe, tap, arrows, keys) and the share button. Nothing else.
(function () {
  var track = document.querySelector('.track');
  var bars = Array.prototype.slice.call(document.querySelectorAll('.bars span'));
  var imgs = Array.prototype.slice.call(document.querySelectorAll('.slide img'));
  var count = imgs.length;
  var current = 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  imgs.forEach(function (img) {
    if (img.complete && img.naturalWidth) img.classList.add('loaded');
    else img.addEventListener('load', function () { img.classList.add('loaded'); });
  });
  // Once the first photo is in, fetch the rest so a swipe never lands on a blank slide.
  window.addEventListener('load', function () {
    imgs.forEach(function (img) { if (img.loading === 'lazy') img.loading = 'eager'; });
  });

  function go(i) {
    i = (i + count) % count;
    track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  var frame;
  track.addEventListener('scroll', function () {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      current = Math.round(track.scrollLeft / track.clientWidth);
      bars.forEach(function (bar, k) { bar.classList.toggle('on', k === current); });
    });
  }, { passive: true });

  // Tap like a story: the left third goes back, the rest goes forward. A swipe never
  // fires a click, so this doesn't fight the native scroll.
  track.addEventListener('click', function (e) {
    var box = track.getBoundingClientRect();
    go(current + (e.clientX - box.left < box.width / 3 ? -1 : 1));
  });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });
  document.querySelector('.nav.prev').addEventListener('click', function () { go(current - 1); });
  document.querySelector('.nav.next').addEventListener('click', function () { go(current + 1); });

  // Share: the native sheet where there is one, otherwise copy the link. Instagram's
  // in-app browser is the main entry point and supports neither reliably, so copying
  // falls back to execCommand, and a failure says so instead of claiming success.
  var toast = document.querySelector('.toast');
  var url = document.querySelector('link[rel="canonical"]').href;
  var hide;

  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(hide);
    hide = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject();
  }

  function copyLink() {
    var copied = navigator.clipboard && window.isSecureContext
      ? navigator.clipboard.writeText(url).catch(function () { return legacyCopy(url); })
      : legacyCopy(url);
    copied.then(function () { say('Link copied'); },
                function () { say('Couldn’t copy the link'); });
  }

  document.querySelector('.share').addEventListener('click', function () {
    if (!navigator.share) return copyLink();
    navigator.share({ title: document.title, url: url }).catch(function (err) {
      if (!err || err.name !== 'AbortError') copyLink();
    });
  });
})();
