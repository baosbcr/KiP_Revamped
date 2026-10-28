import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import QRCode from 'qrcode';
import { socket, session } from '../net.ts';
import { Avatar, IDLE, loadCharacter } from './avatar.ts';
import { MIN_PLAYERS, MAX_PLAYERS, type RoomState } from '../../shared/protocol.ts';

const SPACING = 1.4;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $('status');

// ---- scene ----
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.prepend(renderer.domElement);
const labels = new CSS2DRenderer({ element: $('labels') });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb8c9);
scene.fog = new THREE.Fog(0x8fb8c9, 14, 30);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a45, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -4 });
scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 64), new THREE.MeshStandardMaterial({ color: 0xe9dcc3, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  labels.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

// ---- avatars ----
const avatars = new Map<string, Avatar>();
const gltf = await loadCharacter();
const charHeight = new Avatar(gltf).height;
const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3(0, charHeight * 0.55, 0);

function frameLineup(n: number) {
  // Fit the whole row horizontally with a little margin, whatever the screen's aspect ratio.
  const width = Math.max(4, n * SPACING + 1);
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
  const dist = Math.max(width / 2 / Math.tan(hfov / 2), charHeight * 3.2);
  camTarget.set(0, charHeight * 1.1 + dist * 0.12, dist);
}

function syncAvatars(state: RoomState) {
  const seen = new Set<string>();
  state.players.forEach((p, i) => {
    seen.add(p.id);
    let a = avatars.get(p.id);
    if (!a) {
      a = new Avatar(gltf);
      a.root.position.set((i - (state.players.length - 1) / 2) * SPACING, 0, 0);
      scene.add(a.root);
      avatars.set(p.id, a);
      // A TV reload rebuilds everyone, so start each avatar in the right state.
      if (p.connected) a.play('Jump_Full_Short', 'Cheer', IDLE);
      else a.play('Sit_Floor_Idle');
      a.setOffline(!p.connected);
      a.root.userData.connected = p.connected;
    }
    a.setName(p.name);
    a.setColor(p.color);
    if (a.root.userData.connected !== p.connected) {
      a.root.userData.connected = p.connected;
      a.setOffline(!p.connected);
      if (p.connected) a.play('Sit_Floor_StandUp', 'Cheer', IDLE);
      else a.play('Sit_Floor_Down', 'Sit_Floor_Idle');
    }
    a.root.userData.slot = (i - (state.players.length - 1) / 2) * SPACING;
  });
  for (const [id, a] of avatars) if (!seen.has(id)) { scene.remove(a.root); a.dispose(); avatars.delete(id); }
  frameLineup(state.players.length);
}

// ---- lobby panel ----
const startBtn = $<HTMLButtonElement>('start');
let lastUrl = '';
function render(state: RoomState) {
  document.body.classList.toggle('playing', state.phase !== 'lobby');
  $('code').textContent = state.code;
  if (state.joinUrl !== lastUrl) {
    lastUrl = state.joinUrl;
    $('url').textContent = state.joinUrl.replace(/^https?:\/\//, '');
    QRCode.toCanvas($('qr'), state.joinUrl, { width: 240, margin: 1 }).catch(console.error);
  }
  const online = state.players.filter(p => p.connected).length;
  $('count').textContent = `${state.players.length} / ${MAX_PLAYERS} players`;
  startBtn.disabled = online < MIN_PLAYERS;
  syncAvatars(state);
}

startBtn.onclick = () => socket.emit('tv:start', r => { $('error').textContent = r.ok ? '' : r.error; });

// ---- connection ----
socket.on('room:state', render);
socket.on('disconnect', () => { status.textContent = 'Lost the server, reconnecting…'; });
function hello() {
  status.textContent = '';
  const saved = session.get<{ code: string; tvToken: string }>('kip.tv');
  const create = () => socket.emit('tv:create', r => {
    if (r.ok) session.set('kip.tv', { code: r.code, tvToken: r.tvToken });
    else status.textContent = r.error;
  });
  if (saved) socket.emit('tv:resume', saved, r => { if (!r.ok) create(); });
  else create();
}
socket.on('connect', hello);
if (socket.connected) hello();

// ---- loop ----
frameLineup(0);
camera.position.copy(camTarget);
const timer = new THREE.Timer();
renderer.setAnimationLoop(time => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.05);
  for (const a of avatars.values()) {
    a.root.position.x += ((a.root.userData.slot ?? 0) - a.root.position.x) * Math.min(1, dt * 4);
    a.update(dt);
  }
  camera.position.lerp(camTarget, Math.min(1, dt * 2));
  camera.lookAt(lookTarget);
  renderer.render(scene, camera);
  labels.render(scene, camera);
});
