/* Shared place-bar behaviour.
   The active state used to be hardcoded in markup, so clicking an in-page link
   never moved the underline. This tracks the section you are actually in. */
(function () {
  function init() {
    var bar = document.querySelector('.placebar__links');
    if (!bar) return;
    var links = [].slice.call(bar.querySelectorAll('a'));
    var anchors = links.filter(function (a) {
      var h = a.getAttribute('href') || '';
      return h.charAt(0) === '#';
    });
    if (anchors.length < 2) return;

    var targets = anchors.map(function (a) {
      var id = a.getAttribute('href').slice(1);
      return { a: a, id: id, el: id === 'top' ? document.body : document.getElementById(id) };
    }).filter(function (t) { return t.el; });
    if (!targets.length) return;

    function setActive(a) {
      links.forEach(function (l) {
        if (l === a) { l.setAttribute('aria-current', 'true'); }
        else { l.removeAttribute('aria-current'); }
      });
    }

    // Clicking wins for a moment. Without this the spy immediately overrides the
    // click on short sections, so the underline lands on the neighbour instead.
    var lockUntil = 0;
    anchors.forEach(function (a) {
      a.addEventListener('click', function () {
        setActive(a);
        lockUntil = Date.now() + 900;
      });
    });

    var offset = 190; // global nav plus the place bar, plus a little tolerance
    var ticking = false;
    function spy() {
      ticking = false;
      if (Date.now() < lockUntil) return;
      var y = window.scrollY + offset;
      var current = targets[0];
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        var top = t.id === 'top' ? 0 : t.el.getBoundingClientRect().top + window.scrollY;
        if (top - 12 <= y) current = t;
      }
      // at the very bottom, the last section wins even if it is short
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        current = targets[targets.length - 1];
      }
      setActive(current.a);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    window.addEventListener('resize', spy, { passive: true });
    spy();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
