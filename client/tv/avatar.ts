// A player's character on the TV: one shared KayKit rig, cloned per player, tinted in their colour.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const GEAR = /Shield|Sword|Helmet|Cape/;
const TINTED = /_(Body|ArmLeft|ArmRight|LegLeft|LegRight)$/;
const LOOPING = /Idle|Walking|Running|ing$/;
export const IDLE = 'Unarmed_Idle';

/**
 * Recolours a KayKit part: the texture keeps only its brightness (the shading detail), and material.color supplies
 * the hue. A plain multiply can't do this, because the armour texture is a dark steel that turns yellow into olive.
 */
function recolor(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', /* glsl */ `
    #ifdef USE_MAP
      vec4 texel = texture2D(map, vMapUv);
      float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb *= clamp(pow(lum, 0.45) * 1.35, 0.0, 1.2);
      diffuseColor.a *= texel.a;
    #endif
  `);
}

// ---- face mask: a slightly curved paper cut-out stuck to the head bone (see DESIGN.md, "flat mask style") ----
const MASK_CURVE = 0.32;
const MASK_GEOMETRY = (() => {
  const g = new THREE.PlaneGeometry(1, 1, 24, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, -MASK_CURVE * p.getX(i) ** 2); // edges bend back around the head
  g.computeVertexNormals();
  return g;
})();

/** A circle with a white paper border, and the photo clipped inside it. */
function faceCanvas(img?: CanvasImageSource & { width: number; height: number }) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
  if (img) {
    g.save();
    g.beginPath(); g.arc(256, 256, 226, 0, Math.PI * 2); g.clip();
    const s = Math.max(452 / img.width, 452 / img.height);
    g.drawImage(img, 256 - (img.width * s) / 2, 256 - (img.height * s) / 2, img.width * s, img.height * s);
    g.restore();
  }
  return c;
}
let maskAlpha: THREE.CanvasTexture | undefined; // white disc = the mask's outline, shared by every cardboard back

let template: Promise<GLTF> | undefined;
export const loadCharacter = (url = '/models/Knight.glb') => (template ??= new GLTFLoader().loadAsync(url));

export class Avatar {
  readonly root = new THREE.Group();
  readonly height: number;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private queue: string[] = [];
  private tinted: THREE.MeshStandardMaterial[] = [];
  private label = document.createElement('div');
  private mask = new THREE.Group();
  private maskFront = new THREE.MeshStandardMaterial({ alphaTest: 0.5, roughness: 0.85, side: THREE.FrontSide });
  private maskLoad = 0; // guards against an older photo finishing its load after a newer one

  constructor(gltf: GLTF) {
    const model = clone(gltf.scene);
    model.traverse(o => {
      if (GEAR.test(o.name)) o.visible = false;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false; // skinned bounds don't follow the animation
      if (TINTED.test(mesh.name)) {
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.onBeforeCompile = recolor;
        mesh.material = mat;
        this.tinted.push(mat);
      }
    });
    this.root.add(model);
    model.updateMatrixWorld(true);
    this.height = new THREE.Box3().setFromObject(model).max.y;
    this.buildMask(model);

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.mixer.addEventListener('finished', e => {
      if (e.action !== this.current || !this.queue.length) return;
      const [next, ...rest] = this.queue;
      this.play(next, ...rest);
    });

    this.label.className = 'nameplate';
    const tag = new CSS2DObject(this.label);
    tag.position.set(0, this.height + 0.15, 0);
    this.root.add(tag);
  }

  /** Plays clips in order. Every clip but the last plays once. The last one loops if it's a looping kind. */
  play(name: string, ...then: string[]) {
    const next = this.actions.get(name);
    if (!next) return;
    this.queue = then;
    next.reset();
    next.setLoop(!then.length && LOOPING.test(name) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = true;
    next.play();
    if (this.current && this.current !== next) next.crossFadeFrom(this.current, 0.25, false);
    this.current = next;
  }

  /**
   * Places the mask in front of the face in the rest pose, then attaches it to the head bone, so every animation
   * carries it. It stays hidden until a photo arrives.
   */
  private buildMask(model: THREE.Object3D) {
    const head = model.getObjectByName('head');
    let headMesh: THREE.Object3D | undefined;
    model.traverse(o => { if (/_Head$/.test(o.name) && (o as THREE.Mesh).isMesh) headMesh = o; });
    if (!head || !headMesh) return;

    maskAlpha ??= new THREE.CanvasTexture(faceCanvas());
    const back = new THREE.MeshStandardMaterial({ color: 0xb38b5d, alphaMap: maskAlpha, alphaTest: 0.5, roughness: 1, side: THREE.BackSide });
    for (const m of [this.maskFront, back]) {
      const mesh = new THREE.Mesh(MASK_GEOMETRY, m);
      mesh.castShadow = true;
      this.mask.add(mesh);
    }
    const hb = new THREE.Box3().setFromObject(headMesh);
    const size = (hb.max.x - hb.min.x) * 0.82;
    this.mask.scale.setScalar(size);
    this.mask.position.set((hb.min.x + hb.max.x) / 2, hb.min.y + (hb.max.y - hb.min.y) * 0.45, hb.max.z + size * 0.03);
    this.mask.visible = false;
    this.root.add(this.mask);
    head.attach(this.mask);
  }

  /** Shows a face photo (data URL) on the mask, or hides the mask with null. */
  setMask(dataUrl: string | null) {
    const load = ++this.maskLoad;
    if (!dataUrl) {
      this.mask.visible = false;
      this.maskFront.map?.dispose();
      this.maskFront.map = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (load !== this.maskLoad) return;
      const tex = new THREE.CanvasTexture(faceCanvas(img));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      this.maskFront.map?.dispose();
      this.maskFront.map = tex;
      this.maskFront.needsUpdate = true;
      this.mask.visible = true;
    };
    img.src = dataUrl;
  }

  setColor(hex: string) {
    for (const m of this.tinted) m.color.set(hex);
    this.label.style.setProperty('--player', hex);
  }

  setName(name: string) { this.label.textContent = name; }
  setOffline(offline: boolean) { this.label.classList.toggle('offline', offline); }

  update(dt: number) { this.mixer.update(dt); }

  dispose() { this.label.remove(); this.mixer.stopAllAction(); this.maskFront.map?.dispose(); }
}
