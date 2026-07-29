// --- Hero: the ice/water hard cut ------------------------------------------
//
// The water video plays across the whole viewport; a canvas mask decides where
// it shows through the ice. The divide isn't straight — it sways like a slow
// swell, and the mask's blend, the rule that hides the join and the badge all
// ride that one curve, which is what keeps the rule over the seam at every
// height.

const WAVE_AMPLITUDE = 26;
const WAVE_LENGTH = 440;

// Diameter of the Flott badge sitting on the seam.
const LOGO_SIZE = 92;

// Width of the ice→water blend in the mask, centered on the split. The rule
// that covers it must stay wider (stroke-width in the markup) or the join
// between the still image and the video shows past the rule's edges.
const SEAM_W = LOGO_SIZE / 2;

const waveOffset = (y) => WAVE_AMPLITUDE * Math.sin((y / WAVE_LENGTH) * Math.PI * 2);

const navbar = document.getElementById('navbar');
const burger = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');

const hero = document.querySelector('.ihero');
const heroWater = document.getElementById('ihero-water');
const heroSeam = document.getElementById('ihero-seam');
const heroSeamPath = document.getElementById('ihero-seam-path');
const heroBadge = document.getElementById('ihero-badge');
const heroTagline = document.getElementById('ihero-tagline');

function paintHero() {
  const w = hero.clientWidth;
  const h = hero.clientHeight;
  if (!w || !h) return;

  const splitX = w * 0.5;

  // Walk the canvas a row at a time, sliding the blend along the wave so the
  // ice gives way to water on a curve instead of a straight edge. Each row
  // ramps transparent → opaque across the seam band; a linear gradient clamps
  // both end stops, so everything left of the band stays pure ice and
  // everything right of it is fully revealed water. Cheap enough to do inline
  // — this runs on load and resize, never per frame.
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < h; y++) {
    const cx = splitX + waveOffset(y);
    const gradient = ctx.createLinearGradient(cx - SEAM_W / 2, 0, cx + SEAM_W / 2, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.12, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, w, 1);
  }

  const mask = `url(${canvas.toDataURL()})`;
  heroWater.style.maskImage = mask;
  heroWater.style.webkitMaskImage = mask;

  // The rule traces the same wave the mask blends along. Sampled every 4px and
  // run past both edges so the stroke covers the full height.
  const points = [];
  for (let y = -60; y <= h + 60; y += 4) {
    points.push(`${(splitX + waveOffset(y)).toFixed(2)},${y}`);
  }
  heroSeam.setAttribute('viewBox', `0 0 ${w} ${h}`);
  heroSeamPath.setAttribute('d', `M${points.join('L')}`);

  // The badge and the tagline locked up under it ride the wave too, or they
  // would drift off the line.
  const badgeX = splitX + waveOffset(h / 2);
  heroBadge.style.left = `${badgeX}px`;
  heroTagline.style.left = `${badgeX}px`;
}

if (hero && heroWater) {
  paintHero();

  // paintHero bails when the hero has no size yet, which happens if this runs
  // before layout settles (or in a tab that never rendered). 'load' is the
  // backstop — without it the mask would stay unpainted until a resize.
  window.addEventListener('load', paintHero);

  // Resizing the canvas clears it, so the mask has to be repainted even on a
  // height-only change. Coalesce bursts of resize events into one repaint.
  let pendingPaint;
  window.addEventListener('resize', () => {
    clearTimeout(pendingPaint);
    pendingPaint = setTimeout(paintHero, 100);
  });
}

// --- The seam, continued down the page -------------------------------------
//
// The hero's rule stops at the fold; this carries the same line on through the
// page as a thread that meanders and narrows, drawn in as the reader scrolls.
// Decorative only, and it sits behind every section.

const RIVER_WAVE = 1150; // the long, lazy meander
const RIVER_AMP = 70;
const RIVER_WAVE_2 = 430; // a second, smaller sway, so it doesn't read as a sine
const RIVER_AMP_2 = 16;
const RIVER_HEAD = 27; // half-width at the fold — matches the hero's rule
const RIVER_TAIL = 1.5; // half-width once it has settled into a thread
const RIVER_TAPER = 210; // px over which it narrows
const RIVER_STEP = 12; // sampling along the run

const flowLine = document.getElementById('flow-line');
const flowLinePath = document.getElementById('flow-line-path');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildFlowLine() {
  const heroTop = hero.getBoundingClientRect().top + window.scrollY;
  const top = heroTop + hero.clientHeight;
  const height = Math.max(0, document.body.scrollHeight - top);
  const width = document.documentElement.clientWidth;
  if (!height || !width) return;

  // Start exactly where the hero's seam left off, and set off in the direction
  // it was already heading, so the join doesn't read as a second line.
  const startX = width * 0.5 + waveOffset(hero.clientHeight);
  const heading =
    Math.cos((hero.clientHeight / WAVE_LENGTH) * Math.PI * 2) >= 0 ? 1 : -1;

  const centerX = (t) =>
    startX +
    heading *
      (RIVER_AMP * Math.sin((t / RIVER_WAVE) * Math.PI * 2) +
        RIVER_AMP_2 * Math.sin((t / RIVER_WAVE_2) * Math.PI * 2));
  const halfWidth = (t) =>
    RIVER_TAIL + (RIVER_HEAD - RIVER_TAIL) * Math.exp(-t / RIVER_TAPER);

  // Down one bank and back up the other — a filled ribbon rather than a stroke,
  // because the width has to change along the run.
  const right = [];
  const left = [];
  for (let t = 0; t <= height; t += RIVER_STEP) {
    const cx = centerX(t);
    const hw = halfWidth(t);
    right.push(`${(cx + hw).toFixed(1)},${t}`);
    left.push(`${(cx - hw).toFixed(1)},${t}`);
  }
  left.reverse();

  flowLine.style.top = `${top}px`;
  flowLine.style.width = `${width}px`;
  flowLine.style.height = `${height}px`;
  flowLine.setAttribute('viewBox', `0 0 ${width} ${height}`);
  flowLinePath.setAttribute('d', `M${right.join('L')}L${left.join('L')}Z`);
  revealFlowLine();
}

// Drawn in to a little short of the fold, so the tip stays just ahead of the
// reader instead of being pinned to the bottom edge of the window. This is all
// that runs on scroll — one clip-path string, no geometry, no measuring.
function revealFlowLine() {
  const height = parseFloat(flowLine.style.height);
  if (!height) return;
  if (reduceMotion) {
    flowLine.style.clipPath = 'none';
    return;
  }
  const top = parseFloat(flowLine.style.top) || 0;
  const drawn = window.scrollY + window.innerHeight * 0.92 - top;
  const pct = Math.min(100, Math.max(0, (drawn / height) * 100));
  flowLine.style.clipPath = `inset(0 0 ${(100 - pct).toFixed(2)}% 0)`;
}

if (flowLine && flowLinePath && hero) {
  buildFlowLine();

  // Same backstop as the mask: the first pass bails if the page hasn't laid
  // out yet, and the section reveals keep changing the document height.
  window.addEventListener('load', buildFlowLine);

  let pendingLine;
  window.addEventListener('resize', () => {
    clearTimeout(pendingLine);
    pendingLine = setTimeout(buildFlowLine, 100);
  });

  let linePending = false;
  window.addEventListener(
    'scroll',
    () => {
      if (linePending) return;
      linePending = true;
      requestAnimationFrame(() => {
        revealFlowLine();
        linePending = false;
      });
    },
    { passive: true },
  );
}

// The navbar unfolds from a thin center line while the hero staggers in
// alongside it — choreographed with CSS animation-delays in style.css.
setTimeout(() => {
  if (navbar) navbar.classList.add('v-reveal');
  if (hero) hero.classList.add('v-reveal');
}, 0);

// --- Mobile menu -----------------------------------------------------------

if (burger && navbar) {
  burger.addEventListener('click', () => {
    const open = navbar.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', String(open));
  });
}

if (navLinks && navbar && burger) {
  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      navbar.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}


// --- Navbar solid state once scrolled past the hero ---------------------------
(function () {
  var nav = document.getElementById('navbar');
  if (!nav) return;
  var onScroll = function () {
    nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.72);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// --- AI advisor bubbles: type the reply like it's being written ---------------
(function () {
  var demos = Array.prototype.slice.call(document.querySelectorAll('.ai-demo p'));
  if (!demos.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  demos.forEach(function (p) {
    var full = p.textContent.replace(/\s+/g, ' ').trim();
    var span = document.createElement('span');
    span.className = 'ai-typewriter';
    p.textContent = '';
    p.appendChild(span);
    if (reduce) { span.textContent = full; span.classList.add('done'); return; }
    p._typeFull = full;
    p._typeSpan = span;
    p._typed = false;
  });

  var typeOut = function (p) {
    if (p._typed) return;
    p._typed = true;
    var span = p._typeSpan, full = p._typeFull, i = 0;
    var tick = function () {
      // chunk 1–2 chars per frame-ish for a natural pace
      i += 1;
      span.textContent = full.slice(0, i);
      if (i < full.length) {
        setTimeout(tick, 22 + Math.random() * 34);
      } else {
        span.classList.add('done');
      }
    };
    setTimeout(tick, 220);
  };

  if (reduce) return;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          typeOut(en.target._p);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    demos.forEach(function (p) {
      var host = p.closest('.ai-demo');
      host._p = p;
      io.observe(host);
    });
  } else {
    demos.forEach(typeOut);
  }
})();

// ===== Section interactions (recovered) =====
// Flott — interactions: sticky header, mobile nav, scroll reveal

(function () {
  var header = document.querySelector('.site-header');

  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.site-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Merge scene, act 1: три стороны сделки стягиваются в логотип flott;
  // act 2: логотип уходит влево, провода тянутся к шести шагам
  var scene = document.getElementById('mergeScene');
  if (scene) {
    var stage = scene.querySelector('.merge-stage');
    var wiresIn = scene.querySelector('.wires:not(.wires-out)');
    var wiresOut = scene.querySelector('.wires-out');
    var mergeCenter = scene.querySelector('.merge-center');
    var mergeLogo = scene.querySelector('.merge-logo');
    var mergeCaption = scene.querySelector('.mc-caption');
    var stepsWrap = scene.querySelector('.merge-steps');
    var msSteps = Array.prototype.slice.call(scene.querySelectorAll('.merge-steps .step'));
    var mergeCards = Array.prototype.slice.call(scene.querySelectorAll('.merge-card'));
    var inBases = Array.prototype.slice.call(wiresIn.querySelectorAll('.wire-base'));
    var inFlows = Array.prototype.slice.call(wiresIn.querySelectorAll('.wire-flow'));
    var outBases = Array.prototype.slice.call(wiresOut.querySelectorAll('.wire-base'));
    var outFlows = Array.prototype.slice.call(wiresOut.querySelectorAll('.wire-flow'));
    var mqMobile = window.matchMedia('(max-width: 880px)');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var geo = null;
    var ticking = false;

    var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
    var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    var clearScene = function () {
      mergeCards.forEach(function (c) { c.style.transform = ''; c.style.opacity = ''; });
      mergeCenter.style.transform = '';
      wiresOut.style.opacity = '';
      stepsWrap.style.left = '';
      stepsWrap.style.right = '';
      if (mergeCaption) mergeCaption.style.opacity = '';
      msSteps.forEach(function (s) {
        s.style.opacity = '';
        s.style.transform = '';
      });
    };

    // offsetLeft/offsetTop ignore transforms → stable base geometry
    var measure = function () {
      var isStatic = mqMobile.matches || reduceMotion;
      scene.classList.toggle('static', isStatic);
      if (isStatic) { geo = null; clearScene(); return; }
      var w = stage.clientWidth;
      var h = stage.clientHeight;
      wiresIn.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      wiresOut.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

      // Act 2: логотип + провода + сетка шагов центруются как единая группа
      var FINAL_SCALE = 1.22;
      var WIRE_RUN = 170;
      var logoWs = mergeLogo.offsetWidth * FINAL_SCALE;
      var gridW = stepsWrap.offsetWidth;
      var groupLeft = Math.max(0, (w - (logoWs + WIRE_RUN + gridW)) / 2);
      stepsWrap.style.right = 'auto';
      stepsWrap.style.left = (groupLeft + logoWs + WIRE_RUN) + 'px';

      geo = {
        tx: mergeCenter.offsetLeft,
        ty: mergeCenter.offsetTop,
        shiftX: groupLeft + logoWs / 2 - mergeCenter.offsetLeft,
        logoHalfW: mergeLogo.offsetWidth / 2,
        srcYRel: mergeLogo.offsetTop + mergeLogo.offsetHeight / 2 - mergeCenter.offsetHeight / 2,
        riserBase: stepsWrap.offsetLeft - 26,
        cards: mergeCards.map(function (el) {
          return {
            el: el,
            cx: el.offsetLeft + el.offsetWidth / 2,
            cy: el.offsetTop + el.offsetHeight / 2
          };
        }),
        rows: [0, 1, 2].map(function (i) {
          var s1 = msSteps[i * 2];
          var s2 = msSteps[i * 2 + 1];
          var c2X = stepsWrap.offsetLeft + s2.offsetLeft;
          return {
            rowY: stepsWrap.offsetTop + s1.offsetTop + s1.offsetHeight / 2,
            entry1X: stepsWrap.offsetLeft + s1.offsetLeft + 2,
            gapX: c2X - 10,
            entry2X: c2X + 2,
            cards: [s1, s2]
          };
        })
      };
    };

    var wirePath = function (sx, sy, tx, ty) {
      if (Math.abs(tx - sx) > Math.abs(ty - sy)) {
        var mx = (tx - sx) * 0.5;
        return 'M' + sx + ',' + sy + ' C' + (sx + mx) + ',' + sy + ' ' + (tx - mx) + ',' + ty + ' ' + tx + ',' + ty;
      }
      var my = (ty - sy) * 0.5;
      return 'M' + sx + ',' + sy + ' C' + sx + ',' + (sy + my) + ' ' + tx + ',' + (ty - my) + ' ' + tx + ',' + ty;
    };

    // Trunk out of the logo → soft rounded elbow to the row → into card 1,
    // re-emerging in the column gap → into card 2
    var rowPath = function (sx, sy, rx, rowY, e1, gx, e2) {
      var v = rowY > sy ? 1 : -1;
      var dy = Math.abs(rowY - sy);
      var tail = ' M' + gx + ',' + rowY + ' L' + e2 + ',' + rowY;
      if (dy < 2) {
        return 'M' + sx + ',' + sy + ' L' + e1 + ',' + sy + tail;
      }
      var r = Math.min(18, dy / 2, (rx - sx) / 2, (e1 - rx) / 2);
      return 'M' + sx + ',' + sy +
        ' L' + (rx - r) + ',' + sy +
        ' Q' + rx + ',' + sy + ' ' + rx + ',' + (sy + v * r) +
        ' L' + rx + ',' + (rowY - v * r) +
        ' Q' + rx + ',' + rowY + ' ' + (rx + r) + ',' + rowY +
        ' L' + e1 + ',' + rowY + tail;
    };

    var renderScene = function () {
      ticking = false;
      if (!geo) return;
      var rect = scene.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var p = total > 0 ? clamp01(-rect.top / total) : 0;

      // --- Act 1: merge (p 0.05–0.32) ---
      var e = easeInOut(clamp01((p - 0.05) / 0.27));
      var wireOp = 1 - clamp01((e - 0.6) / 0.3);
      var cardOp = 1 - clamp01((e - 0.78) / 0.18);

      geo.cards.forEach(function (c, i) {
        var dx = (geo.tx - c.cx) * e;
        var dy = (geo.ty - c.cy) * e;
        c.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (1 - 0.62 * e) + ')';
        c.el.style.opacity = cardOp;
        var d = wirePath(c.cx + dx, c.cy + dy, geo.tx, geo.ty);
        inBases[i].setAttribute('d', d);
        inFlows[i].setAttribute('d', d);
        inBases[i].style.opacity = wireOp;
        inFlows[i].style.opacity = wireOp;
      });

      if (mergeCaption) {
        mergeCaption.style.opacity = clamp01((p - 0.3) / 0.08);
      }

      // --- Act 2: dock left, fan out to steps (p 0.42–0.87) ---
      var a = easeOut(clamp01((p - 0.18) / 0.14));
      var f = easeInOut(clamp01((p - 0.42) / 0.14));
      var cs = 1 + 0.15 * a * (1 - f) + 0.22 * f;
      var ctx = geo.shiftX * f;
      mergeCenter.style.transform =
        'translate(calc(-50% + ' + ctx + 'px), -50%) scale(' + cs + ')';

      wiresOut.style.opacity = f;
      var srcX = geo.tx + ctx + geo.logoHalfW * cs + 10;
      var srcY = geo.ty + geo.srcYRel * cs;

      geo.rows.forEach(function (row, i) {
        var ci = clamp01((p - (0.54 + i * 0.1)) / 0.13);
        var exitY = srcY + (i - 1) * 12;
        var riserX = geo.riserBase + (i - 1) * 10;
        var d = rowPath(srcX, exitY, riserX, row.rowY, row.entry1X, row.gapX, row.entry2X);
        outBases[i].setAttribute('d', d);
        outFlows[i].setAttribute('d', d);
        outBases[i].style.strokeDashoffset = 1 - easeOut(ci);
        outFlows[i].style.opacity = clamp01((ci - 0.75) / 0.25);
        row.cards.forEach(function (cardEl, j) {
          var cc = easeOut(clamp01((ci - j * 0.18) * 1.4));
          cardEl.style.opacity = cc;
          cardEl.style.transform = 'translateX(' + 26 * (1 - cc) + 'px)';
        });
      });
    };

    var requestRender = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(renderScene); }
    };

    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', function () { measure(); requestRender(); });
    window.addEventListener('load', function () { measure(); requestRender(); });
    if (mqMobile.addEventListener) {
      mqMobile.addEventListener('change', function () { measure(); requestRender(); });
    }
    measure();
    renderScene();
  }

  // Канвас-фон в hero: полёт внутрь «трубы» из скруглённых рамок;
  // при скролле контент hero растворяется, прокрутка идёт дальше как обычно
  var pipe = document.getElementById('pipeCanvas');
  if (pipe) {
    var pctx = pipe.getContext('2d');
    var heroContent = pipe.parentElement.querySelector('.hero-copy');
    var heroVisual = pipe.parentElement.querySelector('.hero-visual');
    var heroContainer = pipe.parentElement.querySelector('.container');
    var pReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var Z_FAR = 3;
    var Z_NEAR = 0.075;
    var K = 0.085;
    var RING_COUNT = 34;
    var pw = 0, ph = 0, pcx = 0, pcy = 0;
    var visualNat = null;
    var zs = [];
    var pi;
    for (pi = 0; pi < RING_COUNT; pi++) {
      zs.push(Z_NEAR * Math.pow(Z_FAR / Z_NEAR, pi / RING_COUNT));
    }

    var pipeResize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      pw = pipe.clientWidth;
      ph = pipe.clientHeight;
      pipe.width = Math.round(pw * dpr);
      pipe.height = Math.round(ph * dpr);
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pcx = pw * 0.5;
      pcy = ph * 0.44;
      // естественное положение макета (offset-метрики не зависят от transform)
      if (heroVisual && heroContainer) {
        visualNat = {
          x: heroContainer.offsetLeft + heroVisual.offsetLeft + heroVisual.offsetWidth / 2,
          y: heroContainer.offsetTop + heroVisual.offsetTop + heroVisual.offsetHeight / 2
        };
      }
    };

    var drawPipe = function () {
      pctx.clearRect(0, 0, pw, ph);
      // кольца трубы: от дальних к ближним; глубина приглушает дальние
      zs.slice().sort(function (a, b) { return b - a; }).forEach(function (z) {
        var s = K / z;
        var w = pw * 1.04 * s;
        var h = ph * 1.3 * s;
        var aIn = Math.min(1, (Z_FAR - z) * 2);
        var aOut = Math.min(1, (z - Z_NEAR) / 0.09);
        var a = 0.22 * Math.max(0, Math.min(aIn, aOut)) * Math.min(1, 1.3 / z);
        if (a < 0.004) return;
        pctx.strokeStyle = 'rgba(35, 83, 232, ' + a.toFixed(3) + ')';
        pctx.lineWidth = Math.min(2.2, 0.7 + s * 1.5);
        pctx.beginPath();
        pctx.ellipse(pcx, pcy, w / 2, h / 2, 0, 0, Math.PI * 2);
        pctx.stroke();
      });
    };

    // На телефонах — только фоновая труба, без скролл-механики
    var pMobile = window.matchMedia('(max-width: 880px)');
    var clearHeroFx = function () {
      [heroContent, heroVisual].forEach(function (el) {
        if (!el) return;
        el.style.opacity = '';
        el.style.visibility = '';
        el.style.transform = '';
      });
      pipe.style.opacity = '';
    };
    if (pMobile.addEventListener) {
      pMobile.addEventListener('change', function (e) { if (e.matches) clearHeroFx(); });
    }

    // При скролле текст hero летит навстречу и растворяется,
    // а макет платформы выплывает из глубины трубы
    var heroFade = function () {
      if (pMobile.matches) return;
      var f = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 0.9)));
      if (heroContent) {
        var scale = 1 + f * f * 2.2;
        var op = 1 - Math.max(0, Math.min(1, (f - 0.5) / 0.32));
        heroContent.style.opacity = op;
        heroContent.style.visibility = op < 0.02 ? 'hidden' : '';
        heroContent.style.transform = 'scale(' + scale.toFixed(4) + ')';
      }
      if (heroVisual && visualNat) {
        var k = f * f;
        var ms = 0.12 + 0.88 * k;
        var tx = (pcx - visualNat.x) * (1 - k);
        var ty = (pcy - visualNat.y) * (1 - k);
        var vop = Math.max(0, Math.min(1, (f - 0.05) / 0.3));
        heroVisual.style.opacity = vop.toFixed(3);
        heroVisual.style.visibility = vop < 0.02 ? 'hidden' : '';
        heroVisual.style.transform =
          'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + ms.toFixed(4) + ')';
      }
      pipe.style.opacity = Math.max(0, 1 - f * 0.9);
    };

    var pipeLast = 0;
    var pipeTick = function (t) {
      var dt = pipeLast ? Math.min(50, t - pipeLast) : 16;
      pipeLast = t;
      for (var i = 0; i < zs.length; i++) {
        zs[i] *= 1 - 0.00042 * dt;
        if (zs[i] < Z_NEAR) zs[i] *= Z_FAR / Z_NEAR;
      }
      heroFade();
      drawPipe();
      requestAnimationFrame(pipeTick);
    };

    pipeResize();
    drawPipe();
    window.addEventListener('resize', function () { pipeResize(); drawPipe(); });
    window.addEventListener('load', function () { pipeResize(); drawPipe(); });
    if (!pReduce) {
      heroFade();
      requestAnimationFrame(pipeTick);
    }
  }

  // Кабинет клиента: переключение разделов
  var cabMain = document.getElementById('cabMain');
  var cabNav = document.getElementById('cabNav');
  if (cabMain && cabNav) {
    var CAB = {
      overview: {
        title: 'Обзор',
        stats: [
          { label: 'Баланс к выплате', value: 'UZS 840M', note: 'Ближайшая выплата — завтра' },
          { label: 'Активные сделки', value: '7', note: '3 на подписании' },
          { label: 'Риск-профиль', value: 'Низкий', note: 'Скоринг 82', tone: 'good' }
        ],
        listTitle: 'Последние события',
        action: 'Новая заявка',
        rows: [
          { name: 'Выплата по сделке #2841', sub: 'Сегодня, 09:40', val: 'UZS 120M', tag: 'Зачислено', tone: 'good' },
          { name: 'Заявка #2864 — подписание E-IMZO', sub: 'Ожидает вашей подписи', val: 'UZS 96M', tag: 'В процессе', tone: 'warn' },
          { name: 'Счёт №1027 подтверждён покупателем', sub: 'Вчера, 18:02', val: 'UZS 96M', tag: 'Готов к финансированию', tone: 'good' },
          { name: 'Обновлён лимит Turonbank', sub: 'Вчера', val: 'UZS 2.0B', tag: 'Лимит доступен', tone: 'good' }
        ]
      },
      cashflow: {
        title: 'Денежный поток',
        stats: [
          { label: 'Приток за 30 дней', value: 'UZS 1.9B', note: '+12% к прошлому месяцу', tone: 'good' },
          { label: 'Отток за 30 дней', value: 'UZS 1.4B', note: 'Аренда, зарплаты, поставки' },
          { label: 'Прогноз кассового разрыва', value: 'Нет', note: 'Горизонт — 90 дней', tone: 'good' }
        ],
        listTitle: 'Ближайшие поступления',
        action: 'Экспорт отчёта',
        rows: [
          { name: 'Финансирование Turonbank', sub: 'Заявка #2864', val: 'UZS 96M', tag: 'Завтра', tone: 'good' },
          { name: 'Оплата от Korzinka Retail', sub: 'По счёту №1024', val: 'UZS 310M', tag: '12 августа' },
          { name: 'Оплата от Makro Supermarket', sub: 'По счёту №1019', val: 'UZS 180M', tag: '15 августа' },
          { name: 'Оплата от Havas Group', sub: 'По счёту №1031', val: 'UZS 240M', tag: '21 августа' }
        ]
      },
      invoices: {
        title: 'Счета-фактуры',
        stats: [
          { label: 'Всего счетов', value: '132', note: 'Из Налогового комитета — автоматически' },
          { label: 'Ожидают оплаты', value: '15', note: 'UZS 1.2B' },
          { label: 'Просрочено', value: '2', note: 'UZS 84M', tone: 'bad' }
        ],
        listTitle: 'Последние счета',
        action: 'Выбрать для финансирования',
        rows: [
          { name: '№1034 · Korzinka Retail', sub: 'Выставлен сегодня', val: 'UZS 150M', tag: 'Новый' },
          { name: '№1033 · Metro Supplies Ltd', sub: 'Выставлен вчера', val: 'UZS 88M', tag: 'Подтверждён', tone: 'good' },
          { name: '№1031 · Havas Group', sub: '3 дня назад', val: 'UZS 240M', tag: 'Финансируется', tone: 'good' },
          { name: '№1027 · AsiaTrade Wholesale', sub: 'Просрочен на 4 дня', val: 'UZS 46M', tag: 'Просрочен', tone: 'bad' }
        ]
      },
      suppliers: {
        title: 'Управление поставщиками',
        stats: [
          { label: 'Всего поставщиков', value: '24', note: '8 активных в этом месяце' },
          { label: 'Неоплаченные счета', value: 'UZS 1.2B', note: 'По 15 счетам' },
          { label: 'Средние условия оплаты', value: '45 дней', note: 'Улучшено на 5 дней', tone: 'good' }
        ],
        listTitle: 'Топ поставщики',
        action: 'Добавить поставщика',
        rows: [
          { name: 'AsiaTrade Wholesale', sub: '8 активных счетов', val: 'UZS 425M', tag: 'Хорошая репутация', tone: 'good' },
          { name: 'Metro Supplies Ltd', sub: '5 активных счетов', val: 'UZS 320M', tag: 'Хорошая репутация', tone: 'good' },
          { name: 'TechParts Distribution', sub: '4 активных счёта', val: 'UZS 215M', tag: 'На рассмотрении', tone: 'warn' },
          { name: 'Global Imports Co', sub: '6 активных счетов', val: 'UZS 180M', tag: 'Хорошая репутация', tone: 'good' },
          { name: 'Regional Materials', sub: '3 активных счёта', val: 'UZS 95M', tag: 'Хорошая репутация', tone: 'good' }
        ]
      },
      clients: {
        title: 'Клиенты',
        stats: [
          { label: 'Всего клиентов', value: '18', note: '6 новых за квартал' },
          { label: 'Дебиторская задолженность', value: 'UZS 2.1B', note: 'Средний срок — 38 дней' },
          { label: 'Отсрочка платежа', value: '45 дней', note: 'Стандартные условия' }
        ],
        listTitle: 'Крупнейшие клиенты',
        action: 'Добавить клиента',
        rows: [
          { name: 'Korzinka Retail', sub: '12 активных счетов', val: 'UZS 640M', tag: 'Платит вовремя', tone: 'good' },
          { name: 'Makro Supermarket', sub: '9 активных счетов', val: 'UZS 480M', tag: 'Платит вовремя', tone: 'good' },
          { name: 'Havas Group', sub: '7 активных счетов', val: 'UZS 410M', tag: 'Задержка 3 дня', tone: 'warn' },
          { name: 'Uzum Market', sub: '4 активных счёта', val: 'UZS 260M', tag: 'Платит вовремя', tone: 'good' }
        ]
      },
      financing: {
        title: 'Финансирование',
        stats: [
          { label: 'Доступный лимит', value: 'UZS 2.0B', note: 'Turonbank · обновлён сегодня', tone: 'good' },
          { label: 'Профинансировано', value: 'UZS 5.6B', note: 'С начала года' },
          { label: 'Средняя ставка', value: '4,4%', note: '−0,3 п.п. за квартал', tone: 'good' }
        ],
        listTitle: 'Активные сделки',
        action: 'Запросить финансирование',
        rows: [
          { name: 'Сделка #2841', sub: 'Выплата завтра', val: 'UZS 120M', tag: 'Подписана', tone: 'good' },
          { name: 'Сделка #2864', sub: 'Ожидает E-IMZO', val: 'UZS 96M', tag: 'На подписании', tone: 'warn' },
          { name: 'Сделка #2812', sub: 'Погашение 30 августа', val: 'UZS 210M', tag: 'Активна' },
          { name: 'Сделка #2790', sub: 'Погашена 12 июля', val: 'UZS 145M', tag: 'Закрыта' }
        ]
      },
      settings: {
        title: 'Настройки',
        stats: null,
        listTitle: 'Профиль компании',
        action: 'Сохранить',
        rows: [
          { name: 'Компания', sub: '«Поставщик» MChJ · ИНН 305 481 220', val: '', tag: 'Проверена', tone: 'good' },
          { name: 'Подпись E-IMZO', sub: 'Сертификат действует до 12.2026', val: '', tag: 'Активна', tone: 'good' },
          { name: 'Уведомления', sub: 'Telegram и email', val: '', tag: 'Включены', tone: 'good' },
          { name: 'Пользователи', sub: '4 участника команды', val: '', tag: 'Управление' }
        ]
      }
    };

    var cabEsc = function (s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    var cabRender = function (key) {
      var d = CAB[key];
      if (!d) return;
      var html = '<h3 class="cab-title">' + cabEsc(d.title) + '</h3>';
      if (d.stats) {
        html += '<div class="cab-stats">';
        d.stats.forEach(function (s) {
          html += '<div class="cab-stat">' +
            '<div class="cab-stat-label">' + cabEsc(s.label) + '</div>' +
            '<div class="cab-stat-value">' + cabEsc(s.value) + '</div>' +
            '<div class="cab-stat-note' + (s.tone ? ' tone-' + s.tone : '') + '">' + cabEsc(s.note) + '</div>' +
            '</div>';
        });
        html += '</div>';
      }
      html += '<div class="cab-list"><div class="cab-list-head">' +
        '<span class="cab-list-title">' + cabEsc(d.listTitle) + '</span>' +
        '<button class="cab-action" type="button">' + cabEsc(d.action) + '</button></div>' +
        '<div class="cab-rows">';
      d.rows.forEach(function (r) {
        html += '<div class="cab-row"><div class="cab-row-left">' +
          '<div class="cab-row-name">' + cabEsc(r.name) + '</div>' +
          '<div class="cab-row-sub">' + cabEsc(r.sub) + '</div></div>' +
          '<div class="cab-row-right">' +
          (r.val ? '<div class="cab-row-val">' + cabEsc(r.val) + '</div>' : '') +
          '<div class="cab-row-tag' + (r.tone ? ' tone-' + r.tone : '') + '">' + cabEsc(r.tag) + '</div>' +
          '</div></div>';
      });
      html += '</div></div>';
      cabMain.innerHTML = html;
      cabMain.classList.remove('cab-anim');
      void cabMain.offsetWidth;
      cabMain.classList.add('cab-anim');
    };

    cabNav.addEventListener('click', function (e) {
      var btn = e.target.closest('.cab-tab');
      if (!btn) return;
      Array.prototype.forEach.call(cabNav.querySelectorAll('.cab-tab'), function (t) {
        t.classList.toggle('active', t === btn);
      });
      cabRender(btn.getAttribute('data-tab'));
    });

    cabRender('suppliers');
  }

  // Веер заявок в блоке банка: клик поднимает карту, скролл — параллакс
  var bankDeck = document.getElementById('bankDeck');
  if (bankDeck) {
    var deckLayers = Array.prototype.slice.call(bankDeck.querySelectorAll('.deck-layer'));
    var deckCards = Array.prototype.slice.call(bankDeck.querySelectorAll('.deck-cards .panel'));

    var deckAnimating = false;

    deckCards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (deckMq.matches) return;
        if (deckAnimating || card.classList.contains('slot-front')) return;
        var front = bankDeck.querySelector('.deck-cards .slot-front');
        if (!front) return;
        deckAnimating = true;
        // обе карты одновременно едут на позиции друг друга
        front.classList.remove('slot-front');
        front.classList.add('slot-back');
        card.classList.remove('slot-back');
        card.classList.add('slot-front');
        deckLayers.forEach(function (l) {
          l.classList.toggle('on-top', l.contains(card));
        });
        if (typeof reqDeckParallax !== 'undefined' && reqDeckParallax) reqDeckParallax();
        setTimeout(function () { deckAnimating = false; }, 650);
      });
    });

    var deckMq = window.matchMedia('(max-width: 880px)');
    var deckReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!deckReduce && deckLayers.length === 2) {
      var deckTicking = false;
      var deckParallax = function () {
        deckTicking = false;
        if (deckMq.matches) {
          deckLayers.forEach(function (l) { l.style.transform = ''; });
          return;
        }
        var r = bankDeck.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
        // передняя карта стартует ниже и поднимается заметно сильнее задней
        deckLayers.forEach(function (l) {
          var isFront = !!l.querySelector('.slot-front');
          var y = isFront ? (1 - p) * 140 - 52 : (1 - p) * 46 - 16;
          l.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
        });
      };
      var reqDeckParallax = function () {
        if (!deckTicking) { deckTicking = true; requestAnimationFrame(deckParallax); }
      };
      window.addEventListener('scroll', reqDeckParallax, { passive: true });
      window.addEventListener('resize', reqDeckParallax);
      deckParallax();
    }
  }

  // Чат с Flott AI: <dialog> открывается с карточек раздела Flott AI
  var aiDialog = document.getElementById('aiChat');
  if (aiDialog && aiDialog.showModal) {
    var aiChatBody = document.getElementById('aiChatBody');
    var aiChatRole = document.getElementById('aiChatRole');
    var aiReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var aiTimers = [];
    var aiOpener = null;    // the bubble we grew from — hidden while open, restored on close
    var aiOpenTimer = null; // Phase B (content reveal) timer

    var AI_CHATS = {
      client: {
        role: 'AI-советник по финансам',
        msgs: [
          {
            from: 'user',
            file: { name: 'Договор_факторинга_Turonbank.pdf', size: '1,2 МБ' },
            text: 'Проанализируй условия банка-фактора по этому договору — выгодны ли они для нас?'
          },
          {
            from: 'ai',
            text: 'Разобрал договор. Ставка 4,4% годовых — ниже средней по рынку (5,1%). Комиссия за обслуживание 0,8% — в пределах нормы. Факторинг без регресса: риск неплатежа покупателя берёт на себя банк. Выплата — до 24 часов после подтверждения.'
          },
          {
            from: 'ai',
            text: 'Обратите внимание на п. 6.3: при задержке подтверждения покупателем свыше 5 дней ставка вырастает до 5,2%. В целом условия выгодные — рекомендую подписывать. Могу подготовить документы к E-IMZO.'
          }
        ]
      },
      bank: {
        role: 'AI-аналитик рисков',
        msgs: [
          {
            from: 'user',
            file: { name: 'Заявка_№1024_Поставщик_MChJ.pdf', size: '3,4 МБ' },
            text: 'Проанализируй риск по заявке №1024 — можно одобрять?'
          },
          {
            from: 'ai',
            text: 'Скоринг 82/100 — риск низкий. Счета-фактуры подтверждены Налоговым комитетом, дебитор платит без просрочек 14 месяцев подряд. Концентрация на этого дебитора — 18% портфеля, в пределах лимита.'
          },
          {
            from: 'ai',
            text: 'Стоп-факторов не обнаружено. Запрошено 1,25 млрд UZS при доступном лимите 2,0 млрд. Рекомендация: одобрить со ставкой 4,4%. Полный риск-отчёт приложу в карточку заявки.'
          }
        ]
      }
    };

    var aiClearTimers = function () {
      aiTimers.forEach(clearTimeout);
      aiTimers = [];
    };

    var aiScroll = function () {
      aiChatBody.scrollTop = aiChatBody.scrollHeight;
    };

    var aiMsgEl = function (m) {
      var el = document.createElement('div');
      el.className = 'msg ' + (m.from === 'user' ? 'msg-user' : 'msg-ai');
      if (m.file) {
        var f = document.createElement('div');
        f.className = 'msg-file';
        f.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
        var fi = document.createElement('div');
        var fn = document.createElement('div');
        fn.className = 'msg-file-name';
        fn.textContent = m.file.name;
        var fs = document.createElement('div');
        fs.className = 'msg-file-size';
        fs.textContent = 'PDF · ' + m.file.size;
        fi.appendChild(fn);
        fi.appendChild(fs);
        f.appendChild(fi);
        el.appendChild(f);
      }
      var p = document.createElement('p');
      p.textContent = m.text;
      el.appendChild(p);
      return el;
    };

    var aiTypingEl = function () {
      var t = document.createElement('div');
      t.className = 'msg-typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      return t;
    };

    var aiModal = aiDialog.querySelector('.ai-modal');
    var aiSrcRect = null;   // bubble rect the modal grew from — used to shrink back
    var aiFlyer = null;     // reused clone that flies between bubble and header
    var aiFlyTimer = null;

    // Look of the AI avatar at each end of its flight
    var AI_AV_BUBBLE = { radius: '50%', shadow: '0 12px 26px -8px rgba(18, 48, 158, 0.5)' };
    var AI_AV_HEADER = { radius: '10px', shadow: 'none' };

    var aiGetFlyer = function () {
      if (!aiFlyer) {
        aiFlyer = document.createElement('div');
        aiFlyer.className = 'ai-fly-avatar';
        aiFlyer.textContent = 'AI';
        aiFlyer.hidden = true;
        aiDialog.appendChild(aiFlyer);
      }
      return aiFlyer;
    };

    // FLIP a small avatar clone from startRect → endRect, morphing radius + shadow.
    var aiFlyAvatar = function (startRect, endRect, startStyle, endStyle, dur) {
      if (!startRect || !endRect) return;
      var f = aiGetFlyer();
      if (aiFlyTimer) { clearTimeout(aiFlyTimer); aiFlyTimer = null; }
      aiModal.classList.add('ai-flying');
      f.hidden = false;
      f.style.transition = 'none';
      f.style.left = endRect.left + 'px';
      f.style.top = endRect.top + 'px';
      f.style.width = endRect.width + 'px';
      f.style.height = endRect.height + 'px';
      f.style.transformOrigin = '0 0';
      var s = startRect.width / endRect.width;
      f.style.transform =
        'translate(' + (startRect.left - endRect.left) + 'px,' +
        (startRect.top - endRect.top) + 'px) scale(' + s.toFixed(4) + ')';
      f.style.borderRadius = startStyle.radius;
      f.style.boxShadow = startStyle.shadow;
      void f.offsetWidth;
      f.style.transition =
        'transform ' + dur + 'ms cubic-bezier(0.16, 1, 0.3, 1), ' +
        'border-radius ' + dur + 'ms cubic-bezier(0.16, 1, 0.3, 1), ' +
        'box-shadow ' + dur + 'ms ease';
      f.style.transform = 'none';
      f.style.borderRadius = endStyle.radius;
      f.style.boxShadow = endStyle.shadow;
      aiFlyTimer = setTimeout(function () {
        aiFlyTimer = null;
        f.hidden = true;
        aiModal.classList.remove('ai-flying');
      }, dur + 40);
    };

    var aiAvRect = function (el) {
      return el ? el.getBoundingClientRect() : null;
    };

    var openAiChat = function (kind, openerEl) {
      var chat = AI_CHATS[kind];
      if (!chat) return;
      aiClearTimers();
      aiChatRole.textContent = chat.role;
      aiChatBody.innerHTML = '';
      var srcRect = openerEl ? openerEl.getBoundingClientRect() : null;
      aiModal.classList.remove('ai-opening');
      if (aiOpenTimer) { clearTimeout(aiOpenTimer); aiOpenTimer = null; }
      aiDialog.showModal();
      // Пузырь вырастает в окно чата (FLIP), в две фазы:
      // A — сплошная белая карточка растёт из пузыря (контент скрыт, чтобы
      //     неравномерный масштаб не искажал текст);
      // B — когда карточка почти на месте, проявляется содержимое чата.
      if (srcRect && !aiReduce) {
        var target = aiModal.getBoundingClientRect();
        var sx = srcRect.width / target.width;
        var sy = srcRect.height / target.height;
        // Measure both avatar endpoints while the header is still at its natural
        // spot (before ai-opening nudges it or the modal transform is applied).
        var srcAvRect = aiAvRect(openerEl && openerEl.querySelector('.ai-avatar'));
        var headAvRect = aiAvRect(aiDialog.querySelector('.ai-dialog-head .ai-avatar'));

        aiModal.classList.add('ai-opening');
        aiOpener = openerEl;
        aiSrcRect = srcRect;
        if (openerEl) openerEl.style.opacity = '0'; // one shared surface, not two
        aiModal.style.transition = 'none';
        aiModal.style.transformOrigin = '0 0';
        aiModal.style.opacity = '1';
        aiModal.style.transform =
          'translate(' + (srcRect.left - target.left) + 'px,' +
          (srcRect.top - target.top) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
        void aiModal.offsetWidth;
        aiModal.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
        aiModal.style.transform = 'none';
        // The AI avatar flies from the bubble into the header (Telegram-style)
        aiFlyAvatar(srcAvRect, headAvRect, AI_AV_BUBBLE, AI_AV_HEADER, 400);
        // Phase B — reveal the chat chrome once the box is most of the way there
        aiOpenTimer = setTimeout(function () {
          aiModal.classList.remove('ai-opening');
          aiOpenTimer = null;
        }, 250);
      }
      if (aiReduce) {
        chat.msgs.forEach(function (m) { aiChatBody.appendChild(aiMsgEl(m)); });
        aiScroll();
        return;
      }
      var i = 0;
      var next = function () {
        if (i >= chat.msgs.length) return;
        var m = chat.msgs[i++];
        if (m.from === 'user') {
          aiChatBody.appendChild(aiMsgEl(m));
          aiScroll();
          aiTimers.push(setTimeout(next, 550));
        } else {
          var typing = aiTypingEl();
          aiChatBody.appendChild(typing);
          aiScroll();
          aiTimers.push(setTimeout(function () {
            typing.remove();
            aiChatBody.appendChild(aiMsgEl(m));
            aiScroll();
            aiTimers.push(setTimeout(next, 650));
          }, 1000));
        }
      };
      next();
    };

    Array.prototype.forEach.call(document.querySelectorAll('.ai-demo[data-ai]'), function (opener) {
      var kind = opener.getAttribute('data-ai');
      opener.addEventListener('click', function () { openAiChat(kind, opener); });
      opener.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAiChat(kind, opener);
        }
      });
    });

    // Живой ввод: сообщение уходит в ленту (без ответа)
    var aiInput = document.getElementById('aiChatInput');
    var aiSend = document.getElementById('aiChatSend');

    var aiSyncSend = function () {
      aiSend.disabled = aiInput.value.trim() === '';
    };

    var aiSendMsg = function () {
      var text = aiInput.value.trim();
      if (!text) return;
      aiChatBody.appendChild(aiMsgEl({ from: 'user', text: text }));
      aiScroll();
      aiInput.value = '';
      aiSyncSend();
      aiInput.focus();
    };

    aiInput.addEventListener('input', aiSyncSend);
    aiInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        aiSendMsg();
      }
    });
    aiSend.addEventListener('click', aiSendMsg);

    // Reverse of the open: content fades out, the avatar flies home, and the
    // box shrinks back into the bubble (rather than just vanishing).
    var aiAnimatedClose = function () {
      if (aiOpenTimer) { clearTimeout(aiOpenTimer); aiOpenTimer = null; }
      aiModal.classList.remove('ai-opening');

      // Reduced motion (or nothing to shrink into): close instantly, tidy up.
      if (aiReduce) {
        if (aiFlyer) aiFlyer.hidden = true;
        aiModal.classList.remove('ai-flying');
        if (aiOpener) { aiOpener.style.opacity = ''; aiOpener = null; }
        aiDialog.close();
        return;
      }
      if (aiModal.getAttribute('data-closing')) return;
      aiModal.setAttribute('data-closing', '1');

      // 1 — fade the chat chrome out
      aiModal.classList.add('ai-closing');
      // 2 — fade the dim backdrop out alongside
      aiDialog.style.transition = 'background 0.3s ease';
      aiDialog.style.background = 'rgba(10, 11, 16, 0)';
      // 3 — avatar flies back from the header into the bubble
      if (aiOpener) {
        aiFlyAvatar(
          aiAvRect(aiDialog.querySelector('.ai-dialog-head .ai-avatar')),
          aiAvRect(aiOpener.querySelector('.ai-avatar')),
          AI_AV_HEADER, AI_AV_BUBBLE, 340
        );
      }

      // 4 — shrink the box back into the bubble rect (reverse FLIP)
      var useShrink = !!aiSrcRect;
      if (useShrink) {
        var target = aiModal.getBoundingClientRect();
        var sx = aiSrcRect.width / target.width;
        var sy = aiSrcRect.height / target.height;
        aiModal.style.transformOrigin = '0 0';
        aiModal.style.transition = 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1)';
        void aiModal.offsetWidth;
        aiModal.style.transform =
          'translate(' + (aiSrcRect.left - target.left) + 'px,' +
          (aiSrcRect.top - target.top) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
      } else {
        aiModal.style.transformOrigin = '50% 50%';
        aiModal.style.transition =
          'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease';
        void aiModal.offsetWidth;
        aiModal.style.transform = 'scale(0.97)';
        aiModal.style.opacity = '0';
      }

      var closed = false;
      var finish = function (e) {
        // Ignore transitionend bubbling up from the content children — wait for
        // the modal's own transform to finish (or the fallback timer).
        if (e && (e.target !== aiModal || e.propertyName !== 'transform')) return;
        if (closed) return;
        closed = true;
        aiModal.removeEventListener('transitionend', finish);
        if (aiFlyTimer) { clearTimeout(aiFlyTimer); aiFlyTimer = null; }
        if (aiFlyer) aiFlyer.hidden = true;
        aiModal.classList.remove('ai-flying', 'ai-closing');
        aiModal.removeAttribute('data-closing');
        aiModal.style.transition = '';
        aiModal.style.transform = '';
        aiModal.style.transformOrigin = '';
        aiModal.style.opacity = '';
        // Reset the dim here too — the 'close' event is not guaranteed to fire,
        // and a leaked transparent background would kill the dim on reopen.
        aiDialog.style.transition = '';
        aiDialog.style.background = '';
        // Restore the bubble at the very end so the box→bubble swap is seamless.
        if (aiOpener) { aiOpener.style.opacity = ''; aiOpener = null; }
        aiDialog.close();
      };
      aiModal.addEventListener('transitionend', finish);
      setTimeout(finish, useShrink ? 380 : 260);
    };

    document.getElementById('aiChatClose').addEventListener('click', aiAnimatedClose);
    aiDialog.addEventListener('click', function (e) {
      if (e.target === aiDialog) aiAnimatedClose();
    });
    // Esc closes a <dialog> natively — intercept so it animates out too.
    aiDialog.addEventListener('cancel', function (e) {
      e.preventDefault();
      aiAnimatedClose();
    });
    aiDialog.addEventListener('close', function () {
      aiClearTimers();
      aiModal.classList.remove('ai-flying', 'ai-closing', 'ai-opening');
      aiModal.removeAttribute('data-closing');
      aiModal.style.transition = '';
      aiModal.style.transform = '';
      aiModal.style.transformOrigin = '';
      aiModal.style.opacity = '';
      aiDialog.style.transition = '';
      aiDialog.style.background = '';
      if (aiFlyer) aiFlyer.hidden = true;
      aiInput.value = '';
      aiSyncSend();
    });
  }

  // Параллакс в разделе Flott AI: карточки и советы движутся с разной скоростью
  var aiGrid = document.querySelector('.ai-grid');
  if (aiGrid) {
    var aiParCards = Array.prototype.slice.call(aiGrid.querySelectorAll('.ai-card'));
    var aiParDemos = Array.prototype.slice.call(aiGrid.querySelectorAll('.ai-demo'));
    var aiParMq = window.matchMedia('(max-width: 880px)');
    var aiParReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!aiParReduce) {
      var aiParTicking = false;
      var aiParallax = function () {
        aiParTicking = false;
        if (aiParMq.matches) {
          aiParCards.concat(aiParDemos).forEach(function (el) { el.style.transform = ''; });
          return;
        }
        var r = aiGrid.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
        var cardY = (1 - p) * 36 - 14;
        var demoY = (1 - p) * 96 - 36;
        aiParCards.forEach(function (el) {
          el.style.transform = 'translate3d(0,' + cardY.toFixed(1) + 'px,0)';
        });
        aiParDemos.forEach(function (el) {
          el.style.transform = 'translate3d(0,' + demoY.toFixed(1) + 'px,0)';
        });
      };
      var reqAiParallax = function () {
        if (!aiParTicking) { aiParTicking = true; requestAnimationFrame(aiParallax); }
      };
      window.addEventListener('scroll', reqAiParallax, { passive: true });
      window.addEventListener('resize', reqAiParallax);
      aiParallax();
    }
  }

  // Reveal on scroll
  var revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }
})();

// --- Cursor-reactive 3D tilt on the feature cards (fine pointer only) ---------
(function () {
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduceMotion) return;

  var MAX = 6; // degrees
  var setTilt = function (el, ev) {
    var r = el.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width - 0.5;
    var py = (ev.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ty', (px * MAX).toFixed(2) + 'deg');
    el.style.setProperty('--tx', (-py * MAX).toFixed(2) + 'deg');
  };
  var clearTilt = function (el) {
    el.style.setProperty('--ty', '0deg');
    el.style.setProperty('--tx', '0deg');
  };

  // Single-panel cards (02 · client, 03 · underwriter)
  Array.prototype.forEach.call(document.querySelectorAll('.panel-tilt'), function (panel) {
    panel.addEventListener('pointermove', function (ev) { setTilt(panel, ev); });
    panel.addEventListener('pointerleave', function () { clearTilt(panel); });
  });

  // Bank deck (01) — tilt whichever card is currently on top; the swap stays intact
  var deck = document.getElementById('bankDeck');
  if (deck) {
    deck.addEventListener('pointermove', function (ev) {
      var front = deck.querySelector('.slot-front');
      if (front) setTilt(front, ev);
    });
    deck.addEventListener('pointerleave', function () {
      // clear both so a stale tilt never sticks after a swap
      Array.prototype.forEach.call(deck.querySelectorAll('.deck-cards .panel'), clearTilt);
    });
  }

  // Magnetic buttons — the element is pulled toward the cursor
  var MAG = 0.28;
  Array.prototype.forEach.call(document.querySelectorAll('.magnetic'), function (btn) {
    btn.addEventListener('pointermove', function (ev) {
      var r = btn.getBoundingClientRect();
      var mx = ev.clientX - (r.left + r.width / 2);
      var my = ev.clientY - (r.top + r.height / 2);
      btn.style.transform = 'translate(' + (mx * MAG).toFixed(1) + 'px, ' + (my * MAG).toFixed(1) + 'px)';
    });
    btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  });
})();
