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
    this.height = new THREE.Box3().setFromObject(model).max.y;

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

  setColor(hex: string) {
    for (const m of this.tinted) m.color.set(hex);
    this.label.style.setProperty('--player', hex);
  }

  setName(name: string) { this.label.textContent = name; }
  setOffline(offline: boolean) { this.label.classList.toggle('offline', offline); }

  update(dt: number) { this.mixer.update(dt); }

  dispose() { this.label.remove(); this.mixer.stopAllAction(); }
}
