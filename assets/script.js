// Scroll reveal — progressive enhancement only.
// If JS fails or IntersectionObserver isn't supported, elements simply
// stay visible (the .reveal class is added here, not in the HTML/CSS).
(function () {
  if (!('IntersectionObserver' in window)) return;

  var selectors = [
    '.section-head',
    '.subgroup-intro',
    '.card-grid .card',
    '.timeline .entry',
    '.gallery figure',
    '.mosaic figure',
    '.photo-strip img',
    '.access-panel',
    '.logo-strip .logo-grid',
    '.prose p',
    '.video-link.hero-link',
    '.stat',
    '.mini-grid .mini-card',
    '.feature-project'
  ];

  var targets = document.querySelectorAll(selectors.join(','));
  if (!targets.length) return;

  targets.forEach(function (el, i) {
    el.classList.add('reveal');
    // subtle stagger for grouped items (cards, gallery figures)
    var group = el.closest('.card-grid, .gallery, .mosaic, .timeline, .mini-grid, .stats-row');
    if (group) {
      var siblings = Array.prototype.slice.call(group.children);
      var idx = siblings.indexOf(el);
      el.style.transitionDelay = Math.min(idx * 70, 280) + 'ms';
    }
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  targets.forEach(function (el) {
    io.observe(el);
  });
})();

// ---------- Scroll progress bar ----------
(function () {
  var bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  function update() {
    var h = document.documentElement;
    var scrolled = h.scrollTop;
    var height = h.scrollHeight - h.clientHeight;
    bar.style.transform = 'scaleX(' + (height > 0 ? scrolled / height : 0) + ')';
  }
  document.addEventListener('scroll', update, { passive: true });
  update();
})();

// ---------- Custom cursor (pointer devices only) ----------
(function () {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var dot = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  var ringX = 0, ringY = 0, targetX = 0, targetY = 0;

  document.addEventListener('mousemove', function (e) {
    targetX = e.clientX;
    targetY = e.clientY;
    dot.style.left = targetX + 'px';
    dot.style.top = targetY + 'px';
    dot.classList.add('is-active');
    ring.classList.add('is-active');
  });

  document.addEventListener('mouseleave', function () {
    dot.classList.remove('is-active');
    ring.classList.remove('is-active');
  });

  function loop() {
    ringX += (targetX - ringX) * 0.18;
    ringY += (targetY - ringY) * 0.18;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var hoverables = document.querySelectorAll('a, button, .magnetic, .card, .mini-card, .video-link, .poster-link');
  hoverables.forEach(function (el) {
    el.addEventListener('mouseenter', function () { ring.classList.add('is-hover'); });
    el.addEventListener('mouseleave', function () { ring.classList.remove('is-hover'); });
  });
})();

// ---------- Magnetic buttons ----------
(function () {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = document.querySelectorAll('.magnetic');
  items.forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2;
      var y = e.clientY - r.top - r.height / 2;
      el.style.transform = 'translate(' + x * 0.18 + 'px, ' + y * 0.28 + 'px)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = 'translate(0,0)';
    });
  });
})();

// ---------- Stat count-up ----------
(function () {
  var stats = document.querySelectorAll('.stat-num');
  if (!stats.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce || !('IntersectionObserver' in window)) {
      el.textContent = target;
      return;
    }
    var start = null;
    var duration = 1100;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window)) {
    stats.forEach(animateCount);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(function (el) { io.observe(el); });
})();

// ---------- Lightbox carousel for gallery/mosaic photos ----------
(function () {
  var groups = document.querySelectorAll('.gallery, .mosaic');
  if (!groups.length) return;

  var lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML =
    '<button class="lightbox-close" aria-label="Cerrar">&times;</button>' +
    '<button class="lightbox-prev" aria-label="Anterior">&#10094;</button>' +
    '<img class="lightbox-img" src="" alt="">' +
    '<button class="lightbox-next" aria-label="Siguiente">&#10095;</button>' +
    '<div class="lightbox-counter"></div>';
  document.body.appendChild(lightbox);

  var imgEl = lightbox.querySelector('.lightbox-img');
  var counterEl = lightbox.querySelector('.lightbox-counter');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var prevBtn = lightbox.querySelector('.lightbox-prev');
  var nextBtn = lightbox.querySelector('.lightbox-next');
  var currentList = [];
  var currentIndex = 0;

  function show() {
    var img = currentList[currentIndex];
    imgEl.src = img.src;
    imgEl.alt = img.alt || '';
    counterEl.textContent = (currentIndex + 1) + ' / ' + currentList.length;
  }
  function openAt(list, index) {
    currentList = list;
    currentIndex = index;
    show();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function prev() { currentIndex = (currentIndex - 1 + currentList.length) % currentList.length; show(); }
  function next() { currentIndex = (currentIndex + 1) % currentList.length; show(); }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', function (e) { e.stopPropagation(); prev(); });
  nextBtn.addEventListener('click', function (e) { e.stopPropagation(); next(); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  groups.forEach(function (group) {
    var imgs = Array.prototype.slice.call(group.querySelectorAll('img'));
    if (!imgs.length) return;
    imgs.forEach(function (img, i) {
      var figure = img.closest('figure') || img;
      figure.classList.add('zoomable');
      figure.addEventListener('click', function () { openAt(imgs, i); });
    });
  });
})();
