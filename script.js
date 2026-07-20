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
