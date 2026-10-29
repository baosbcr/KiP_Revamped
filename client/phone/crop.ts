// Full-screen crop editor: drag to move, pinch or use the slider to zoom, and the circle shows what goes on the mask.
import { MASK_SIZE } from '../../shared/protocol.ts';

const VIEW = 600; // editor canvas resolution (CSS scales it to the screen)
const HOLE = 0.42; // circle radius as a fraction of VIEW: matches the mask's visible face area

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Could not read that image.')); };
    img.src = URL.createObjectURL(file); // browsers apply the photo's EXIF rotation when drawing
  });
}

/** Opens the editor for `file`. Resolves with a square JPEG data URL, or null if the player cancels. */
export async function cropFace(file: File): Promise<string | null> {
  const img = await loadImage(file);
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const overlay = $('cropper');
  const canvas = $<HTMLCanvasElement>('cropCanvas');
  const zoomIn = $<HTMLInputElement>('zoom');
  const g = canvas.getContext('2d')!;
  canvas.width = canvas.height = VIEW;

  // The image covers the circle at zoom 1. Offsets are in canvas pixels from the centre.
  const base = (2 * HOLE * VIEW) / Math.min(img.width, img.height);
  let zoom = 1, ox = 0, oy = 0;
  zoomIn.value = '1';

  const scale = () => base * zoom;
  function clamp() {
    // Keep the circle fully covered by the photo.
    const r = HOLE * VIEW;
    const mx = Math.max(0, (img.width * scale()) / 2 - r), my = Math.max(0, (img.height * scale()) / 2 - r);
    ox = Math.min(mx, Math.max(-mx, ox));
    oy = Math.min(my, Math.max(-my, oy));
  }
  function drawPhoto(ctx: CanvasRenderingContext2D, size: number) {
    const k = size / VIEW, s = scale() * k;
    ctx.drawImage(img, size / 2 + ox * k - (img.width * s) / 2, size / 2 + oy * k - (img.height * s) / 2, img.width * s, img.height * s);
  }
  function draw() {
    g.clearRect(0, 0, VIEW, VIEW);
    drawPhoto(g, VIEW);
    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.beginPath();
    g.rect(0, 0, VIEW, VIEW);
    g.arc(VIEW / 2, VIEW / 2, HOLE * VIEW, 0, Math.PI * 2, true);
    g.fill('evenodd');
    g.strokeStyle = '#fff';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(VIEW / 2, VIEW / 2, HOLE * VIEW, 0, Math.PI * 2);
    g.stroke();
  }

  // Pointer handling: one finger drags, two fingers pinch.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart = 0, zoomStart = 1;
  const toCanvas = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW, y: ((e.clientY - r.top) / r.height) * VIEW };
  };
  const dist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.onpointerdown = e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, toCanvas(e));
    if (pointers.size === 2) { pinchStart = dist(); zoomStart = zoom; }
  };
  canvas.onpointermove = e => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const now = toCanvas(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 1) { ox += now.x - prev.x; oy += now.y - prev.y; }
    else if (pointers.size === 2 && pinchStart > 0) {
      zoom = Math.min(4, Math.max(1, (zoomStart * dist()) / pinchStart));
      zoomIn.value = String(zoom);
    }
    clamp(); draw();
  };
  canvas.onpointerup = canvas.onpointercancel = e => { pointers.delete(e.pointerId); pinchStart = 0; };
  zoomIn.oninput = () => { zoom = +zoomIn.value; clamp(); draw(); };

  draw();
  overlay.hidden = false;
  return new Promise(resolve => {
    const done = (result: string | null) => { overlay.hidden = true; resolve(result); };
    $('cropCancel').onclick = () => done(null);
    $('cropUse').onclick = () => {
      // Export just the circle's bounding square, at mask resolution.
      const out = document.createElement('canvas');
      out.width = out.height = MASK_SIZE;
      const o = out.getContext('2d')!;
      const crop = 2 * HOLE * VIEW; // the square around the circle, in editor pixels
      o.save();
      o.translate(MASK_SIZE / 2, MASK_SIZE / 2);
      o.scale(MASK_SIZE / crop, MASK_SIZE / crop);
      o.translate(-VIEW / 2, -VIEW / 2);
      drawPhoto(o, VIEW);
      o.restore();
      done(out.toDataURL('image/jpeg', 0.85));
    };
  });
}
