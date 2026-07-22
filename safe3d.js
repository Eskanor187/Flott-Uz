// 3D-сейф в hero: процедурная модель Three.js.
// Кнопки «Работаю с Flott» / «Без Flott» и наведение курсора открывают/закрывают дверцу.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
  const holder = document.getElementById('safeScene');
  if (!holder) return;

  const mq = window.matchMedia('(max-width: 880px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mq.matches || reduce) return; // на мобильных и при reduced-motion остаются статичные картинки

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // нет WebGL — остаётся картинка
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'safe-canvas';
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.55, 7.2);

  // Свет
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(3.2, 4.5, 4.5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.radius = 7;
  dir.shadow.camera.left = -4;
  dir.shadow.camera.right = 4;
  dir.shadow.camera.top = 4;
  dir.shadow.camera.bottom = -4;
  scene.add(dir);
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x9fb4d8, 0.55));

  // Материалы
  const matBody = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5, metalness: 0.4 });
  const matInner = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.85, metalness: 0.2 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.18, metalness: 1.0 });
  const matFob = new THREE.MeshStandardMaterial({ color: 0x2353e8, roughness: 0.35, metalness: 0.1 });
  const matBill = new THREE.MeshStandardMaterial({ color: 0xd7e0e8, roughness: 0.9, metalness: 0 });
  const matBand = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });

  const root = new THREE.Group();
  scene.add(root);

  const shadowOn = (m) => { m.castShadow = true; return m; };

  // Корпус (передняя грань открыта — там дверной проём)
  const body = shadowOn(new THREE.Mesh(new RoundedBoxGeometry(2.3, 2.05, 1.7, 4, 0.08), matBody));
  body.position.z = -0.15;
  root.add(body);

  // Рама проёма
  const frameZ = 0.85;
  const frameD = 0.32;
  const mkFrame = (w, h, x, y) => {
    const m = shadowOn(new THREE.Mesh(new RoundedBoxGeometry(w, h, frameD, 2, 0.04), matBody));
    m.position.set(x, y, frameZ);
    root.add(m);
  };
  mkFrame(2.3, 0.245, 0, 0.9);
  mkFrame(2.3, 0.245, 0, -0.9);
  mkFrame(0.26, 1.56, -1.02, 0);
  mkFrame(0.26, 1.56, 1.02, 0);

  // Интерьер
  const inner = new THREE.Group();
  root.add(inner);
  const innerBack = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.56, 0.06), matInner);
  innerBack.position.set(0, 0, -0.35);
  inner.add(innerBack);
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matInner);
    m.position.set(x, y, z);
    inner.add(m);
  };
  mkWall(1.78, 0.05, 1.34, 0, 0.755, 0.32);
  mkWall(1.78, 0.05, 1.34, 0, -0.755, 0.32);
  mkWall(0.05, 1.56, 1.34, -0.865, 0, 0.32);
  mkWall(0.05, 1.56, 1.34, 0.865, 0, 0.32);
  // Полка
  mkWall(1.7, 0.06, 1.26, 0, 0.06, 0.32);

  // Пачки денег
  const mkStack = (x, y, z, rot) => {
    const g = new THREE.Group();
    const bills = shadowOn(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.15, 0.3, 2, 0.02), matBill));
    g.add(bills);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.315), matBand);
    g.add(band);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    inner.add(g);
  };
  // верхняя полка
  mkStack(-0.5, 0.17, 0.35, 0.1);
  mkStack(0.05, 0.17, 0.3, -0.12);
  mkStack(0.58, 0.17, 0.38, 0.18);
  mkStack(-0.22, 0.325, 0.32, -0.05);
  mkStack(0.35, 0.325, 0.33, 0.22);
  // низ
  mkStack(-0.45, -0.65, 0.35, -0.15);
  mkStack(0.12, -0.65, 0.3, 0.08);
  mkStack(0.62, -0.65, 0.4, -0.2);
  mkStack(-0.15, -0.495, 0.33, 0.14);

  // Синяя LED-подсветка внутри
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.045, 0.045),
    new THREE.MeshBasicMaterial({ color: 0x8ab6ff })
  );
  led.position.set(0, 0.7, 0.62);
  inner.add(led);
  const ledLight = new THREE.PointLight(0x4d8dff, 9, 2.8, 2);
  ledLight.position.set(0, 0.42, 0.3);
  inner.add(ledLight);

  // Дверца (петли слева)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.89, 0, 1.04);
  root.add(doorPivot);

  const door = new THREE.Group();
  door.position.x = 0.89;
  doorPivot.add(door);

  const doorPanel = shadowOn(new THREE.Mesh(new RoundedBoxGeometry(1.78, 1.56, 0.14, 3, 0.05), matBody));
  door.add(doorPanel);
  const doorBack = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.35, 0.05), matInner);
  doorBack.position.z = -0.09;
  door.add(doorBack);

  // Петли
  const mkHinge = (y) => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 20), matChrome);
    h.position.set(-0.86, y, 0.02);
    door.add(h);
  };
  mkHinge(0.5);
  mkHinge(-0.5);

  // Замочная скважина + ключ + брелок FLOTT
  const lock = new THREE.Group();
  lock.position.set(0.12, 0.02, 0.08);
  door.add(lock);

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.07, 36), matChrome);
  plate.rotation.x = Math.PI / 2;
  lock.add(plate);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.085, 20), matInner);
  hole.rotation.x = Math.PI / 2;
  lock.add(hole);

  const key = new THREE.Group();
  key.position.set(0, 0, 0.06);
  lock.add(key);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.3, 20), matChrome);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.15;
  key.add(shaft);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.032, 14, 28), matChrome);
  bow.position.z = 0.32;
  key.add(bow);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 12, 24), matChrome);
  ring.position.set(0, -0.13, 0.32);
  key.add(ring);

  // Брелок с надписью FLOTT
  const fobGroup = new THREE.Group();
  fobGroup.position.set(0, -0.19, 0.32);
  fobGroup.rotation.z = -0.12;
  key.add(fobGroup);
  const fob = shadowOn(new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.46, 0.06, 3, 0.035), matFob));
  fob.position.y = -0.23;
  fobGroup.add(fob);

  const fobCanvas = document.createElement('canvas');
  fobCanvas.width = 256;
  fobCanvas.height = 384;
  const fctx = fobCanvas.getContext('2d');
  fctx.clearRect(0, 0, 256, 384);
  fctx.save();
  fctx.translate(128, 192);
  fctx.rotate(-Math.PI / 2);
  fctx.font = '700 84px Arial';
  fctx.textAlign = 'center';
  fctx.textBaseline = 'middle';
  fctx.fillStyle = 'rgba(255,255,255,0.92)';
  fctx.fillText('FLOTT', 0, 0);
  fctx.restore();
  const fobTex = new THREE.CanvasTexture(fobCanvas);
  fobTex.colorSpace = THREE.SRGBColorSpace;
  const fobLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.27, 0.42),
    new THREE.MeshBasicMaterial({ map: fobTex, transparent: true })
  );
  fobLabel.position.set(0, -0.23, 0.034);
  fobGroup.add(fobLabel);

  // Пол-тень
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.06;
  ground.receiveShadow = true;
  scene.add(ground);

  root.rotation.y = 0.38;

  // Состояние: кнопки + hover
  let buttonOpen = false;
  let hovering = false;
  let doorAngle = 0;
  const OPEN_ANGLE = -1.9;

  const btnWith = document.getElementById('btnWithFlott');
  const btnWithout = document.getElementById('btnWithoutFlott');
  if (btnWith) btnWith.addEventListener('click', () => { buttonOpen = true; });
  if (btnWithout) btnWithout.addEventListener('click', () => { buttonOpen = false; });

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    hovering = ray.intersectObject(root, true).length > 0;
    renderer.domElement.style.cursor = hovering ? 'pointer' : '';
  });
  renderer.domElement.addEventListener('pointerleave', () => { hovering = false; });

  // Размеры и компоновка (сейф справа)
  const resize = () => {
    const w = holder.clientWidth;
    const h = holder.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    root.position.x = Math.min(Math.max(halfW * 0.42, 0.6), 2.7);
  };
  new ResizeObserver(resize).observe(holder);
  resize();

  const clock = new THREE.Clock();
  let ready = false;

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // парение
    root.position.y = Math.sin(t * 0.9) * 0.055;
    root.rotation.y = 0.38 + Math.sin(t * 0.45) * 0.04;
    root.rotation.z = Math.sin(t * 0.7) * 0.008;

    // дверца
    const target = (buttonOpen || hovering) ? OPEN_ANGLE : 0;
    doorAngle += (target - doorAngle) * (1 - Math.exp(-dt * 4.2));
    doorPivot.rotation.y = doorAngle;

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      holder.classList.add('video-ready'); // прячем статичную картинку
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Если окно сузили до мобильного — вернуть картинку
  mq.addEventListener('change', () => {
    const mobile = mq.matches;
    renderer.domElement.style.display = mobile ? 'none' : '';
    holder.classList.toggle('video-ready', !mobile);
  });
})();
