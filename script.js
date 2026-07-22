// Flott — interactions: sticky header, mobile nav, scroll reveal

(function () {
  var header = document.querySelector('.site-header');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  toggle.addEventListener('click', function () {
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

  // Демо-дашборд: интерактив (переключение разделов, дропдауны, графики Chart.js)
  var ddMain = document.getElementById('ddMain');
  var ddNav = document.getElementById('ddNav');
  if (ddMain && ddNav) {
    var ddFmt = function (n) { return n.toLocaleString('ru-RU'); };
    var ddCharts = [];

    // 90 дней данных денежного потока
    var ddCashFlow = (function () {
      var data = [];
      var today = new Date();
      var bal = 1250;
      for (var i = 0; i < 90; i += 5) {
        var d = new Date(today); d.setDate(d.getDate() + i);
        var inflow = Math.round(Math.random() * 300 + 200);
        var outflow = Math.round(Math.random() * 350 + 150);
        bal = bal + inflow - outflow;
        data.push({ date: d.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }), inflow: inflow, outflow: outflow, balance: Math.round(bal) });
      }
      return data;
    })();

    var ddInvoices = [
      { id: 'INV-2036', customer: 'Business Solutions Inc', date: '28 дек 2024', amount: 145000000, status: 'pending', risk: 'low' },
      { id: 'INV-2035', customer: 'Regional Retail Chain', date: '30 дек 2024', amount: 280000000, status: 'paid', risk: 'low' },
      { id: 'INV-2034', customer: 'Global Trade Partners', date: '2 янв 2025', amount: 165000000, status: 'pending', risk: 'medium' },
      { id: 'INV-2033', customer: 'Central Supplies Ltd', date: '5 янв 2025', amount: 92000000, status: 'overdue', risk: 'high' },
      { id: 'INV-2032', customer: 'Eastern Distribution Co', date: '8 янв 2025', amount: 310000000, status: 'pending', risk: 'low' },
      { id: 'INV-2031', customer: 'Northern Wholesale LLC', date: '10 янв 2025', amount: 198000000, status: 'paid', risk: 'low' },
      { id: 'INV-2030', customer: 'Southern Trading Group', date: '12 янв 2025', amount: 135000000, status: 'pending', risk: 'medium' },
      { id: 'INV-2029', customer: 'Western Imports Inc', date: '15 янв 2025', amount: 245000000, status: 'pending', risk: 'low' },
      { id: 'INV-2028', customer: 'Pacific Distributors', date: '18 янв 2025', amount: 175000000, status: 'overdue', risk: 'high' },
      { id: 'INV-2027', customer: 'Atlantic Commerce Ltd', date: '20 янв 2025', amount: 88000000, status: 'pending', risk: 'medium' }
    ];

    var ddStatusLabel = { paid: 'Оплачено', pending: 'Ожидает', overdue: 'Просрочено' };
    var ddRiskLabel = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };

    var ddInvoiceRows = function () {
      return ddInvoices.map(function (v) {
        return '<tr>' +
          '<td><span class="dd-inv-id">' + v.id + '</span></td>' +
          '<td>' + v.customer + '</td>' +
          '<td>' + v.date + '</td>' +
          '<td class="dd-amt">' + ddFmt(v.amount) + '</td>' +
          '<td><span class="dd-pill ' + v.status + '">' + ddStatusLabel[v.status] + '</span></td>' +
          '<td><span class="dd-pill ' + v.risk + '">' + ddRiskLabel[v.risk] + '</span></td>' +
          '</tr>';
      }).join('');
    };

    var ddInvoiceTable = function () {
      return '<div class="dd-table-wrap"><table class="dd-table"><thead><tr>' +
        '<th>№ счета</th><th>Клиент/Поставщик</th><th>Срок оплаты</th><th>Сумма (UZS)</th><th>Статус</th><th>Риск</th>' +
        '</tr></thead><tbody>' + ddInvoiceRows() + '</tbody></table></div>';
    };

    var ddLegend = function (withBal) {
      return '<div class="dd-legend"><span class="leg"><span class="dd-dot in"></span>Поступления</span>' +
        '<span class="leg"><span class="dd-dot out"></span>Выплаты</span>' +
        (withBal ? '<span class="leg"><span class="dd-dot bal"></span>Баланс</span>' : '') + '</div>';
    };

    // рендер разделов → строка HTML
    var ddSections = {
      overview: function () {
        return '<div class="dd-stack">' +
          '<div class="dd-grid3">' +
            '<div class="dd-card"><div class="dd-stat-label">Баланс на сегодня</div><div class="dd-stat-value">UZS 1,25B</div><div class="dd-stat-sub good"><i class="fas fa-arrow-up"></i>+12% к прошлому месяцу</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Счета к получению (следующие 7 дней)</div><div class="dd-stat-value sm">UZS 420M</div><div class="dd-stat-sub">12 счетов</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Счета к оплате (следующие 7 дней)</div><div class="dd-stat-value sm">UZS 385M</div><div class="dd-stat-sub warn"><i class="fas fa-exclamation-triangle"></i>8 счетов · Предупреждение о разрыве ликвидности</div></div>' +
          '</div>' +
          '<div class="dd-grid-chart">' +
            '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Прогнозируемый денежный поток (следующие 90 дней)</h3>' + ddLegend(true) + '</div><div class="dd-chart-h"><canvas data-chart="overview"></canvas></div></div>' +
            '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Задачи на сегодня от вашего агента денежного потока</h3></div><div class="dd-tasks">' +
              '<div class="dd-task"><div class="dd-task-ic high"><i class="fas fa-phone"></i></div><div><div class="dd-task-title">Позвонить поставщику AsiaTrade, чтобы перенести срок на 5 дней</div><div class="dd-task-meta">Срок: UZS 125M · Счет #INV-2041</div></div></div>' +
              '<div class="dd-task"><div class="dd-task-ic medium"><i class="fas fa-percentage"></i></div><div><div class="dd-task-title">Предложить скидку за раннюю оплату клиенту Alpha</div><div class="dd-task-meta">Ожидается: UZS 180M · Сэкономить 2% скидки</div></div></div>' +
              '<div class="dd-task"><div class="dd-task-ic low"><i class="fas fa-hand-holding-usd"></i></div><div><div class="dd-task-title">Рассмотреть финансирование счета #INV-2043 (UZS 320M)</div><div class="dd-task-meta">Предварительно одобрено · Комиссия 1.5% · 30 дней</div></div></div>' +
            '</div></div>' +
          '</div>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Ключевые счета</h3><button class="dd-btn-ghost" type="button">Посмотреть все</button></div>' + ddInvoiceTable() + '</div>' +
        '</div>';
      },
      cashFlow: function () {
        return '<div class="dd-stack"><h2 class="dd-h2">Аналитика денежного потока</h2>' +
          '<div class="dd-grid3">' +
            '<div class="dd-card"><div class="dd-stat-label">Чистый денежный поток (90 дней)</div><div class="dd-stat-value">UZS 850M</div><div class="dd-stat-sub good"><i class="fas fa-arrow-up"></i>12% к предыдущему периоду</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Средний дневной приток</div><div class="dd-stat-value">UZS 258M</div><div class="dd-stat-sub">За 90 дней</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Средний дневной отток</div><div class="dd-stat-value">UZS 249M</div><div class="dd-stat-sub">За 90 дней</div></div>' +
          '</div>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Прогноз денежного потока на 90 дней</h3>' + ddLegend(true) + '</div><div class="dd-chart-h tall"><canvas data-chart="cf90"></canvas></div></div>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Сравнение месячного денежного потока</h3>' + ddLegend(false) + '</div><div class="dd-chart-h mid"><canvas data-chart="cfMonthly"></canvas></div></div>' +
        '</div>';
      },
      invoices: function () {
        return '<div class="dd-stack"><h2 class="dd-h2">Управление счетами</h2>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Все счета</h3><button class="dd-btn-primary" type="button">Создать счет</button></div>' + ddInvoiceTable() + '</div></div>';
      },
      suppliers: function () {
        var list = [
          { name: 'AsiaTrade Wholesale', amount: 'UZS 425M', invoices: 8, status: 'Хорошая репутация', tone: 'green' },
          { name: 'Metro Supplies Ltd', amount: 'UZS 320M', invoices: 5, status: 'Хорошая репутация', tone: 'green' },
          { name: 'TechParts Distribution', amount: 'UZS 215M', invoices: 4, status: 'На рассмотрении', tone: 'amber' },
          { name: 'Global Imports Co', amount: 'UZS 180M', invoices: 6, status: 'Хорошая репутация', tone: 'green' },
          { name: 'Regional Materials', amount: 'UZS 95M', invoices: 3, status: 'Хорошая репутация', tone: 'green' }
        ].map(function (s) {
          return '<div class="dd-row"><div><div class="dd-row-name">' + s.name + '</div><div class="dd-row-sub">' + s.invoices + ' активных счетов</div></div>' +
            '<div class="dd-row-right"><div class="dd-row-val">' + s.amount + '</div><div class="dd-tone-' + s.tone + '" style="font-size:0.72rem">' + s.status + '</div></div></div>';
        }).join('');
        return '<div class="dd-stack"><h2 class="dd-h2">Управление поставщиками</h2>' +
          '<div class="dd-grid3">' +
            '<div class="dd-card"><div class="dd-stat-label">Всего поставщиков</div><div class="dd-stat-value">24</div><div class="dd-stat-sub">8 активных в этом месяце</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Неоплаченные счета</div><div class="dd-stat-value">UZS 1.2B</div><div class="dd-stat-sub">По 15 счетам</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Средние условия оплаты</div><div class="dd-stat-value">45 дней</div><div class="dd-stat-sub good">Улучшено на 5 дней</div></div>' +
          '</div>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Топ поставщики</h3><button class="dd-btn-primary" type="button">Добавить поставщика</button></div><div class="dd-list">' + list + '</div></div></div>';
      },
      customers: function () {
        var list = [
          { name: 'TechCorp Distribution', amount: 'UZS 820M', invoices: 12, credit: 'UZS 1.5B', score: 95 },
          { name: 'Customer Alpha Ltd', amount: 'UZS 650M', invoices: 8, credit: 'UZS 1B', score: 88 },
          { name: 'Regional Retail Chain', amount: 'UZS 420M', invoices: 10, credit: 'UZS 800M', score: 92 },
          { name: 'Metro Trading LLC', amount: 'UZS 380M', invoices: 6, credit: 'UZS 600M', score: 78 },
          { name: 'Business Solutions Inc', amount: 'UZS 285M', invoices: 5, credit: 'UZS 500M', score: 85 }
        ].map(function (c) {
          var tone = c.score >= 90 ? 'green' : c.score >= 80 ? 'blue' : 'amber';
          return '<div class="dd-row"><div><div class="dd-row-name">' + c.name + '</div><div class="dd-row-sub">' + c.invoices + ' счетов · Кредитный лимит: ' + c.credit + '</div></div>' +
            '<div class="dd-row-right"><div class="dd-row-val">' + c.amount + '</div><div class="dd-tone-' + tone + '" style="font-size:0.72rem">Оценка платежей: ' + c.score + '</div></div></div>';
        }).join('');
        return '<div class="dd-stack"><h2 class="dd-h2">Управление клиентами</h2>' +
          '<div class="dd-grid3">' +
            '<div class="dd-card"><div class="dd-stat-label">Всего клиентов</div><div class="dd-stat-value">42</div><div class="dd-stat-sub">12 новых в этом квартале</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Неоплаченная дебиторка</div><div class="dd-stat-value">UZS 2.8B</div><div class="dd-stat-sub">По 28 счетам</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Среднее время взыскания</div><div class="dd-stat-value">32 дней</div><div class="dd-stat-sub good"><i class="fas fa-arrow-up"></i>На 8% быстрее</div></div>' +
          '</div>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Топ клиенты</h3><button class="dd-btn-primary" type="button">Добавить клиента</button></div><div class="dd-list">' + list + '</div></div></div>';
      },
      financing: function () {
        var eligible = [
          { id: 'INV-2043', customer: 'TechCorp Distribution', amount: 320000000, fee: '1.5%', term: '30 дней' },
          { id: 'INV-2039', customer: 'Customer Alpha Ltd', amount: 180000000, fee: '1.6%', term: '45 дней' },
          { id: 'INV-2037', customer: 'Metro Trading LLC', amount: 215000000, fee: '1.7%', term: '30 дней' },
          { id: 'INV-2035', customer: 'Regional Retail Chain', amount: 145000000, fee: '1.5%', term: '30 дней' }
        ].map(function (e) {
          return '<div class="dd-row" style="cursor:default"><div><div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><span class="dd-mono">' + e.id + '</span><span class="dd-badge-green">Предварительно одобрено</span></div>' +
            '<div class="dd-row-name">' + e.customer + '</div><div class="dd-row-sub">Комиссия: ' + e.fee + ' · Срок: ' + e.term + '</div></div>' +
            '<div class="dd-row-right" style="display:flex;align-items:center;gap:16px"><div><div class="dd-row-val">' + ddFmt(e.amount) + ' UZS</div><div class="dd-row-sub">Доступно сейчас</div></div>' +
            '<button class="dd-btn-primary" type="button">Финансировать сейчас</button></div></div>';
        }).join('');
        return '<div class="dd-stack"><h2 class="dd-h2">Финансирование счетов</h2>' +
          '<div class="dd-grid3">' +
            '<div class="dd-card"><div class="dd-stat-label">Доступная кредитная линия</div><div class="dd-stat-value">UZS 5B</div><div class="dd-stat-sub">Использовано UZS 2.3B</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Активное финансирование</div><div class="dd-stat-value">UZS 2.3B</div><div class="dd-stat-sub">12 счетов профинансировано</div></div>' +
            '<div class="dd-card"><div class="dd-stat-label">Средняя ставка финансирования</div><div class="dd-stat-value">1.8%</div><div class="dd-stat-sub good">Лучше среднерыночной</div></div>' +
          '</div>' +
          '<div class="dd-card"><div class="dd-card-head"><h3 class="dd-card-title">Подходит для финансирования</h3><span class="dd-row-sub">Предварительно одобрено банками-партнерами</span></div><div class="dd-list">' + eligible + '</div></div>' +
          '<div class="dd-benefit-card"><h3 class="dd-card-title" style="margin-bottom:16px">Почему финансирование с Flott?</h3><div class="dd-benefit-grid">' +
            '<div class="dd-benefit"><div class="dd-benefit-ic b"><i class="fas fa-dollar-sign"></i></div><div><div class="dd-benefit-title">Мгновенные деньги</div><div class="dd-benefit-desc">Получите оплату в течение 24 часов</div></div></div>' +
            '<div class="dd-benefit"><div class="dd-benefit-ic p"><i class="fas fa-chart-line"></i></div><div><div class="dd-benefit-title">Гибкие условия</div><div class="dd-benefit-desc">Выберите график погашения</div></div></div>' +
            '<div class="dd-benefit"><div class="dd-benefit-ic g"><i class="fas fa-arrow-up"></i></div><div><div class="dd-benefit-title">Без залога</div><div class="dd-benefit-desc">Только финансирование под счет</div></div></div>' +
          '</div></div>' +
        '</div>';
      },
      settings: function () {
        var banks = [
          { name: 'Kapitalbank', account: '****1234', on: true },
          { name: 'Ipoteka Bank', account: '****5678', on: true },
          { name: 'NBU', account: '****9012', on: false }
        ].map(function (b) {
          return '<div class="dd-bank"><div class="dd-bank-left"><div class="dd-bank-ic"><i class="fas fa-dollar-sign"></i></div><div><div class="dd-row-name">' + b.name + '</div><div class="dd-row-sub">' + b.account + '</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:12px"><span class="dd-chip ' + (b.on ? 'on' : 'off') + '">' + (b.on ? 'Подключен' : 'Отключен') + '</span>' +
            '<button class="dd-btn-primary" type="button">' + (b.on ? 'Управлять' : 'Подключить') + '</button></div></div>';
        }).join('');
        var notifs = [
          { label: 'Email-уведомления о просроченных счетах', on: true },
          { label: 'SMS-уведомления о полученных платежах', on: true },
          { label: 'Предупреждения о прогнозе денежного потока', on: true },
          { label: 'Еженедельная финансовая сводка', on: false },
          { label: 'Маркетинговые письма', on: false }
        ].map(function (n) {
          return '<div class="dd-setting-row"><span style="color:#d1d5db">' + n.label + '</span><button class="dd-toggle ' + (n.on ? 'on' : '') + '" type="button"><span></span></button></div>';
        }).join('');
        return '<div class="dd-stack"><h2 class="dd-h2">Настройки</h2>' +
          '<div class="dd-card"><h3 class="dd-card-title" style="margin-bottom:16px">Профиль компании</h3><div class="dd-form-grid">' +
            '<div class="dd-field"><label>Название компании</label><input type="text" value="TechCorp Industries"></div>' +
            '<div class="dd-field"><label>Налоговый ID</label><input type="text" value="123456789"></div>' +
            '<div class="dd-field"><label>Email</label><input type="email" value="contact@techcorp.uz"></div>' +
            '<div class="dd-field"><label>Телефон</label><input type="tel" value="+998 90 123 45 67"></div>' +
            '<div class="dd-field full"><label>Адрес</label><input type="text" value="ул. Амира Темура 123, Ташкент, Узбекистан"></div>' +
          '</div></div>' +
          '<div class="dd-card"><h3 class="dd-card-title" style="margin-bottom:16px">Подключенные банки</h3><div class="dd-stack-sm">' + banks + '</div>' +
            '<button class="dd-btn-soft" type="button" style="width:100%;margin-top:16px">+ Добавить новый банковский счет</button></div>' +
          '<div class="dd-card"><h3 class="dd-card-title" style="margin-bottom:16px">Настройки уведомлений</h3><div class="dd-stack-sm">' + notifs + '</div></div>' +
          '<div class="dd-card"><h3 class="dd-card-title" style="margin-bottom:16px">Безопасность</h3><div class="dd-stack-sm">' +
            '<div class="dd-setting-row"><div><div class="dd-row-name">Двухфакторная аутентификация</div><div class="dd-row-sub">Дополнительный уровень безопасности</div></div><button class="dd-btn-green" type="button">Включено</button></div>' +
            '<div class="dd-setting-row"><div><div class="dd-row-name">Изменить пароль</div><div class="dd-row-sub">Последнее изменение 45 дней назад</div></div><button class="dd-btn-primary" type="button">Обновить</button></div>' +
            '<div class="dd-setting-row"><div><div class="dd-row-name">Активные сессии</div><div class="dd-row-sub">Управление активными сессиями</div></div><button class="dd-btn-soft" type="button">Просмотр</button></div>' +
          '</div></div>' +
          '<div class="dd-actions-end"><button class="dd-btn-soft" type="button">Отмена</button><button class="dd-btn-primary" type="button">Сохранить изменения</button></div>' +
        '</div>';
      }
    };

    var ddLineOpts = function () {
      return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: 'rgba(30, 41, 59, 0.95)', titleColor: '#fff', bodyColor: '#9ca3af',
            borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12,
            callbacks: { label: function (c) { return (c.dataset.label || '') + ': UZS ' + Math.round(c.parsed.y) + 'M'; } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { size: 11 }, callback: function (v) { return v + 'M'; } } }
        },
        interaction: { mode: 'index', intersect: false }
      };
    };

    var ddArea = function (canvas, tall) {
      var ctx = canvas.getContext('2d');
      var mk = function (c) {
        var g = ctx.createLinearGradient(0, 0, 0, tall ? 360 : 256);
        g.addColorStop(0, c + '4d'); g.addColorStop(1, c + '00'); return g;
      };
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: ddCashFlow.map(function (d) { return d.date; }),
          datasets: [
            { label: 'Поступления', data: ddCashFlow.map(function (d) { return d.inflow; }), borderColor: '#10b981', backgroundColor: mk('#10b981'), borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
            { label: 'Выплаты', data: ddCashFlow.map(function (d) { return d.outflow; }), borderColor: '#ef4444', backgroundColor: mk('#ef4444'), borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
            { label: 'Баланс', data: ddCashFlow.map(function (d) { return d.balance; }), borderColor: '#3b82f6', backgroundColor: mk('#3b82f6'), borderWidth: 3, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5 }
          ]
        },
        options: ddLineOpts()
      });
    };

    var ddBars = function (canvas) {
      var ctx = canvas.getContext('2d');
      var months = [
        { month: 'Авг', inflows: 6800, outflows: 6200 }, { month: 'Сен', inflows: 7200, outflows: 6800 },
        { month: 'Окт', inflows: 7800, outflows: 7100 }, { month: 'Ноя', inflows: 8200, outflows: 7600 },
        { month: 'Дек', inflows: 8600, outflows: 7900 }, { month: 'Янв', inflows: 9100, outflows: 8300 }
      ];
      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months.map(function (m) { return m.month; }),
          datasets: [
            { label: 'Поступления', data: months.map(function (m) { return m.inflows; }), backgroundColor: '#10b981', borderRadius: 8 },
            { label: 'Выплаты', data: months.map(function (m) { return m.outflows; }), backgroundColor: '#ef4444', borderRadius: 8 }
          ]
        },
        options: ddLineOpts()
      });
    };

    var ddBuildCharts = function () {
      Array.prototype.forEach.call(ddMain.querySelectorAll('canvas[data-chart]'), function (cv) {
        var kind = cv.getAttribute('data-chart');
        if (typeof Chart === 'undefined') return;
        if (kind === 'overview') ddCharts.push(ddArea(cv, false));
        else if (kind === 'cf90') ddCharts.push(ddArea(cv, true));
        else if (kind === 'cfMonthly') ddCharts.push(ddBars(cv));
      });
    };

    var ddRender = function (key) {
      ddCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
      ddCharts = [];
      ddMain.innerHTML = (ddSections[key] || ddSections.overview)();
      ddBuildCharts();
      Array.prototype.forEach.call(ddMain.querySelectorAll('.dd-toggle'), function (t) {
        t.addEventListener('click', function () { t.classList.toggle('on'); });
      });
    };

    ddNav.addEventListener('click', function (e) {
      var btn = e.target.closest('.dd-tab');
      if (!btn) return;
      Array.prototype.forEach.call(ddNav.querySelectorAll('.dd-tab'), function (t) { t.classList.toggle('active', t === btn); });
      ddRender(btn.getAttribute('data-section'));
    });

    // Дропдауны (уведомления + пользователь)
    var ddBellBtn = document.getElementById('ddBellBtn');
    var ddNotifMenu = document.getElementById('ddNotifMenu');
    var ddUserBtn = document.getElementById('ddUserBtn');
    var ddUserMenu = document.getElementById('ddUserMenu');
    var ddCloseMenus = function () {
      if (ddNotifMenu) ddNotifMenu.hidden = true;
      if (ddUserMenu) ddUserMenu.hidden = true;
    };
    if (ddBellBtn) ddBellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = ddNotifMenu.hidden;
      ddCloseMenus();
      ddNotifMenu.hidden = !open;
    });
    if (ddUserBtn) ddUserBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = ddUserMenu.hidden;
      ddCloseMenus();
      ddUserMenu.hidden = !open;
    });
    [ddNotifMenu, ddUserMenu].forEach(function (m) { if (m) m.addEventListener('click', function (e) { e.stopPropagation(); }); });
    document.addEventListener('click', ddCloseMenus);

    ddRender('overview');
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

    var openAiChat = function (kind, openerEl) {
      var chat = AI_CHATS[kind];
      if (!chat) return;
      aiClearTimers();
      aiChatRole.textContent = chat.role;
      aiChatBody.innerHTML = '';
      var srcRect = openerEl ? openerEl.getBoundingClientRect() : null;
      aiDialog.showModal();
      // пузырь плавно вырастает в окно чата (FLIP)
      if (srcRect && !aiReduce) {
        var target = aiModal.getBoundingClientRect();
        var sx = srcRect.width / target.width;
        var sy = srcRect.height / target.height;
        aiModal.style.transition = 'none';
        aiModal.style.transformOrigin = '0 0';
        aiModal.style.transform =
          'translate(' + (srcRect.left - target.left) + 'px,' +
          (srcRect.top - target.top) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
        aiModal.style.opacity = '0.35';
        void aiModal.offsetWidth;
        aiModal.style.transition =
          'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.9s ease';
        aiModal.style.transform = 'none';
        aiModal.style.opacity = '1';
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

    document.getElementById('aiChatClose').addEventListener('click', function () {
      aiDialog.close();
    });
    aiDialog.addEventListener('click', function (e) {
      if (e.target === aiDialog) aiDialog.close();
    });
    aiDialog.addEventListener('close', function () {
      aiClearTimers();
      aiModal.style.transition = '';
      aiModal.style.transform = '';
      aiModal.style.transformOrigin = '';
      aiModal.style.opacity = '';
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

  // Сейф в hero: два клипа. «Работаю с Flott» — открытие, «Без Flott» — закрытие.
  var safeScene = document.getElementById('safeScene');
  if (safeScene) {
    var safeOpenVid = document.getElementById('safeOpen');
    var safeCloseVid = document.getElementById('safeClose');
    var btnWithFlott = document.getElementById('btnWithFlott');
    var btnWithoutFlott = document.getElementById('btnWithoutFlott');
    var safeNote = document.getElementById('safeNote');

    var safeSetState = function (open) {
      btnWithFlott.classList.toggle('active', open);
      btnWithoutFlott.classList.toggle('active', !open);
      if (safeNote) {
        safeNote.textContent = open
          ? 'С Flott счета превращаются в деньги за часы — сейф открыт.'
          : 'Без Flott деньги неделями заперты в дебиторке.';
      }
    };

    // проигрываем нужный клип, второй прячем; последний кадр остаётся на экране
    var safePlay = function (vid, other) {
      other.classList.remove('on');
      try { vid.currentTime = 0; } catch (e) {}
      vid.classList.add('on');
      var p = vid.play();
      if (p && p.catch) p.catch(function () {});
    };

    btnWithFlott.addEventListener('click', function () { safeSetState(true); safePlay(safeOpenVid, safeCloseVid); });
    btnWithoutFlott.addEventListener('click', function () { safeSetState(false); safePlay(safeCloseVid, safeOpenVid); });
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
