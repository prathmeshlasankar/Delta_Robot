(function () {
'use strict';
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var $ = function (id) { return document.getElementById(id); };

/* ---------- Navigation ---------- */
var toggle = $('navToggle'), links = $('navLinks');
toggle.addEventListener('click', function () {
  var open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
links.addEventListener('click', function (e) {
  if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
});

/* ---------- Scroll reveal ---------- */
var reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduce) {
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); rio.unobserve(x.target); } });
  }, { threshold: 0.1 });
  reveals.forEach(function (e) { rio.observe(e); });
} else { reveals.forEach(function (e) { e.classList.add('in'); }); }

/* ---------- Controls shared by 3D and fallback ---------- */
var host = $('viewer'), fb = $('fallback'), btnPlay = $('btnPlay'), btnReset = $('btnReset'), statusEl = $('status');
var playing = false, tAnim = 0, resetHook = function () {}, usingFallback = false;
function setStatus(txt) { statusEl.textContent = txt + ' · conceptual animation'; }
function setPlay(p) {
  playing = p;
  btnPlay.textContent = p ? 'Pause' : 'Play';
  btnPlay.setAttribute('aria-pressed', String(p));
  fb.classList.toggle('paused', !p);
  if (!p) setStatus('Paused');
}
btnPlay.addEventListener('click', function () { setPlay(!playing); });
btnReset.addEventListener('click', function () { tAnim = 0; resetHook(); setPlay(false); setStatus('Reset to home position'); });

function useFallback() {
  usingFallback = true; host.hidden = true; fb.hidden = false;
  setPlay(!reduce);
  if (playing) setStatus('Playing simplified 2D view');
}

if (!window.THREE) { useFallback(); return; }
var renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
catch (err) { useFallback(); return; }

/* ---------- Illustrative geometry (NOT project dimensions) ---------- */
var TAU = Math.PI * 2;
var R = 1.3, RF = 1.5, RE = 3.0, RR = 0.35, W = 0.2; // frame, upper arm, lower arm, effector radius, half rod spacing
var TABLE_Z = -4.15;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
host.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
var sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(5, 10, 6); scene.add(sun);
var rim = new THREE.DirectionalLight(0x38d6f2, 0.5); rim.position.set(-6, 3, -5); scene.add(rim);

var robot = new THREE.Group();          // robot coordinates: z is up, rotated into three.js y-up
robot.rotation.x = -Math.PI / 2; robot.position.y = 3; scene.add(robot);
var grid = new THREE.GridHelper(10, 20, 0x1f6f80, 0x15263f); grid.position.y = 3 + TABLE_Z; scene.add(grid);

function mat(c, m) { return new THREE.MeshStandardMaterial({ color: c, metalness: m || 0.3, roughness: 0.45 }); }
var mCyan = mat(0x38d6f2, 0.4), mGrey = mat(0xc9d4e5, 0.5), mDark = mat(0x26364f, 0.6), mObj = mat(0xe6edf7, 0.1);
var rodGeo = new THREE.CylinderGeometry(1, 1, 1, 12), UP = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
function rod(rad, m) { var o = new THREE.Mesh(rodGeo, m); o.userData.rad = rad; robot.add(o); return o; }
function setRod(o, a, b) {
  tmp.subVectors(b, a); var L = tmp.length(), r = o.userData.rad;
  o.position.addVectors(a, b).multiplyScalar(0.5); o.scale.set(r, L, r);
  o.quaternion.setFromUnitVectors(UP, tmp.normalize());
}
function toG(i, lx, ly, lz) {
  var p = i * TAU / 3, c = Math.cos(p), s = Math.sin(p);
  return new THREE.Vector3(lx * c - ly * s, lx * s + ly * c, lz);
}

/* static upper triangular frame and actuators */
var verts = [0, 1, 2].map(function (i) { var a = i * TAU / 3 + Math.PI / 3; return new THREE.Vector3(2 * R * Math.cos(a), 2 * R * Math.sin(a), 0); });
for (var i = 0; i < 3; i++) setRod(rod(0.07, mGrey), verts[i], verts[(i + 1) % 3]);
var upper = [], elbows = [], lower = [];
for (i = 0; i < 3; i++) {
  var S = toG(i, R, 0, 0), t = toG(i, 0, 1, 0);
  setRod(rod(0.22, mDark), S.clone().addScaledVector(t, -0.3), S.clone().addScaledVector(t, 0.3));
  upper.push(rod(0.07, mCyan));
  var el = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), mCyan); robot.add(el); elbows.push(el);
  lower.push([rod(0.04, mGrey), rod(0.04, mGrey)]);
}
/* end-effector, fingers, object */
var effGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 28); effGeo.rotateX(Math.PI / 2);
var eff = new THREE.Mesh(effGeo, mCyan); robot.add(eff);
var fingers = [0, 1].map(function () { var f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.4), mGrey); robot.add(f); return f; });
var cube = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mObj); robot.add(cube);

/* ---------- Standard delta inverse kinematics (placeholder dimensions) ---------- */
function shoulderAngle(i, p) {
  var ph = i * TAU / 3, c = Math.cos(ph), s = Math.sin(ph);
  var x = p.x * c + p.y * s, y = -p.x * s + p.y * c, z = p.z;
  var a = R - (x + RR), A = 2 * a * RF, B = 2 * RF * z;
  var C = RE * RE - a * a - RF * RF - y * y - z * z, m = Math.hypot(A, B);
  var d = Math.acos(Math.max(-1, Math.min(1, C / m))), f = Math.atan2(B, A);
  var t1 = f + d, t2 = f - d;
  return Math.cos(t1) >= Math.cos(t2) ? t1 : t2;
}
var pos = new THREE.Vector3(0, 0, -2.9), grip = 0;
function updateRobot() {
  for (var i = 0; i < 3; i++) {
    var th = shoulderAngle(i, pos), c = Math.cos(i * TAU / 3), s = Math.sin(i * TAU / 3);
    var S = toG(i, R, 0, 0), E = toG(i, R + RF * Math.cos(th), 0, -RF * Math.sin(th));
    setRod(upper[i], S, E); elbows[i].position.copy(E);
    var P = new THREE.Vector3(pos.x + RR * c, pos.y + RR * s, pos.z), t = new THREE.Vector3(-s, c, 0);
    for (var k = 0; k < 2; k++) {
      var sg = k ? 1 : -1;
      setRod(lower[i][k], E.clone().addScaledVector(t, sg * W), P.clone().addScaledVector(t, sg * W));
    }
  }
  eff.position.copy(pos);
  var g = 0.4 - 0.14 * grip;
  fingers[0].position.set(pos.x - g, pos.y, pos.z - 0.25);
  fingers[1].position.set(pos.x + g, pos.y, pos.z - 0.25);
}

/* ---------- Illustrative pick-and-place animation ---------- */
var HOME = [0, 0, -2.9], PICK = [-1.2, -0.8], PLACE = [1.2, 0.8], ZUP = -2.9, ZDN = -3.55;
// [x, y, z, grip, duration to arrive, label]
var KF = [
  [HOME[0], HOME[1], HOME[2], 0, 0, ''],
  [PICK[0], PICK[1], ZUP, 0, 1.2, 'Moving to pick position'],
  [PICK[0], PICK[1], ZDN, 0, 0.8, 'Descending'],
  [PICK[0], PICK[1], ZDN, 1, 0.4, 'Gripping'],
  [PICK[0], PICK[1], ZUP, 1, 0.8, 'Lifting'],
  [PLACE[0], PLACE[1], ZUP, 1, 1.2, 'Moving to place position'],
  [PLACE[0], PLACE[1], ZDN, 1, 0.8, 'Descending'],
  [PLACE[0], PLACE[1], ZDN, 0, 0.4, 'Releasing'],
  [PLACE[0], PLACE[1], ZUP, 0, 0.8, 'Lifting'],
  [HOME[0], HOME[1], HOME[2], 0, 1.2, 'Returning home']
];
var TOTAL = KF.reduce(function (s, k) { return s + k[4]; }, 0);
var lastK = -1;
function ease(u) { return u * u * (3 - 2 * u); }
function setCube(k) {
  if (k <= 3) cube.position.set(PICK[0], PICK[1], TABLE_Z + 0.2);
  else if (k <= 7) cube.position.set(pos.x, pos.y, pos.z - 0.4);
  else cube.position.set(PLACE[0], PLACE[1], TABLE_Z + 0.2);
}
function pose(t) {
  t = t % TOTAL; var k = 1, acc = 0;
  while (k < KF.length - 1 && t > acc + KF[k][4]) { acc += KF[k][4]; k++; }
  var u = ease(Math.min(1, (t - acc) / KF[k][4])), a = KF[k - 1], b = KF[k];
  pos.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
  grip = a[3] + (b[3] - a[3]) * u; setCube(k);
  if (k !== lastK) { lastK = k; if (playing) setStatus(b[5]); }
}
resetHook = function () { lastK = -1; pose(0); updateRobot(); };
resetHook();

/* ---------- Simple orbit camera (mouse, touch, keyboard) ---------- */
var cam = { theta: 0.8, phi: 1.2, r: 12 }, target = new THREE.Vector3(0, 1, 0);
function placeCamera() {
  camera.position.set(
    target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
    target.y + cam.r * Math.cos(cam.phi),
    target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta));
  camera.lookAt(target);
}
function rotate(dt, dp) { cam.theta += dt; cam.phi = Math.max(0.25, Math.min(1.75, cam.phi + dp)); }
function zoom(f) { cam.r = Math.max(6, Math.min(20, cam.r * f)); }
var cv = renderer.domElement, ptrs = {}, pinch = 0;
function count() { return Object.keys(ptrs).length; }
function pdist() { var v = Object.keys(ptrs).map(function (k) { return ptrs[k]; }); return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); }
cv.addEventListener('pointerdown', function (e) {
  cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (count() === 2) pinch = pdist();
});
cv.addEventListener('pointermove', function (e) {
  var p = ptrs[e.pointerId]; if (!p) return;
  if (count() === 1) rotate(-(e.clientX - p.x) * 0.008, -(e.clientY - p.y) * 0.008);
  p.x = e.clientX; p.y = e.clientY;
  if (count() === 2) { var d = pdist(); if (pinch) zoom(pinch / d); pinch = d; }
});
function up(e) { delete ptrs[e.pointerId]; pinch = 0; }
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', function (e) { e.preventDefault(); zoom(1 + e.deltaY * 0.001); }, { passive: false });
host.addEventListener('keydown', function (e) {
  var m = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
  if (m) { e.preventDefault(); rotate(m[0], m[1]); }
  else if (e.key === '+' || e.key === '=') zoom(0.9);
  else if (e.key === '-') zoom(1.1);
});

/* ---------- Render loop (paused when off-screen) ---------- */
function resize() {
  var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
var visible = true;
if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
var last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  var dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!visible) return;
  if (playing) { tAnim += dt; pose(tAnim); updateRobot(); }
  placeCamera(); renderer.render(scene, camera);
}
setPlay(false);
setStatus(reduce ? 'Paused (reduced motion is on)' : 'Paused');
requestAnimationFrame(frame);
})();
