import { socket, session, local } from '../net.ts';
import { cropFace } from './crop.ts';
import { PLAYER_COLORS, type RoomState } from '../../shared/protocol.ts';

interface Seat { code: string; token: string; name: string }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const codeIn = $<HTMLInputElement>('code');
const nameIn = $<HTMLInputElement>('name');
const goBtn = $<HTMLButtonElement>('go');
let me: { id: string; seat: Seat } | undefined;

codeIn.value = new URLSearchParams(location.search).get('r') ?? session.get<Seat>('kip.seat')?.code ?? '';
nameIn.value = local.get<string>('kip.name') ?? '';
(codeIn.value ? nameIn : codeIn).focus();

function show(id: 'join' | 'lobby' | 'playing') {
  for (const s of ['join', 'lobby', 'playing']) $(s).hidden = s !== id;
}

function join(code: string, name: string, token?: string) {
  goBtn.disabled = true;
  socket.emit('player:join', { code, name, token }, r => {
    goBtn.disabled = false;
    if (!r.ok) {
      session.remove('kip.seat');
      me = undefined;
      show('join');
      $('joinError').textContent = r.error;
      return;
    }
    const seat = { code: code.toUpperCase(), token: r.token, name };
    me = { id: r.playerId, seat };
    session.set('kip.seat', seat);
    local.set('kip.name', name);
    $('joinError').textContent = '';
  });
}

goBtn.onclick = () => join(codeIn.value.trim(), nameIn.value.trim());
for (const el of [codeIn, nameIn]) el.addEventListener('keydown', e => { if (e.key === 'Enter') goBtn.click(); });

// Colour swatches: other players' colours are greyed out. The server has the final say.
const swatches = PLAYER_COLORS.map(c => {
  const b = document.createElement('button');
  b.style.setProperty('--c', c);
  b.setAttribute('aria-label', `Colour ${c}`);
  b.onclick = () => socket.emit('player:color', { color: c }, r => { $('lobbyError').textContent = r.ok ? '' : r.error; });
  $('swatches').append(b);
  return { c, b };
});

// Face photo: pick or shoot, crop to a circle, send. The server passes it to the TV only.
const facePic = $('facePic');
function showFace(dataUrl: string | null) {
  facePic.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : '';
  facePic.textContent = dataUrl ? '' : '🙂';
}
for (const id of ['selfie', 'pick']) {
  const input = $<HTMLInputElement>(id);
  input.onchange = async () => {
    const file = input.files?.[0];
    input.value = ''; // so picking the same file again still fires change
    if (!file) return;
    try {
      const dataUrl = await cropFace(file);
      if (!dataUrl) return;
      socket.emit('player:mask', { dataUrl }, r => {
        if (r.ok) showFace(dataUrl);
        $('lobbyError').textContent = r.ok ? '' : r.error;
      });
    } catch (err) {
      $('lobbyError').textContent = err instanceof Error ? err.message : 'Could not use that photo.';
    }
  };
}
socket.on('room:mask', ({ playerId, dataUrl }) => { if (playerId === me?.id) showFace(dataUrl); });

socket.on('room:state', (state: RoomState) => {
  const mine = me && state.players.find(p => p.id === me!.id);
  if (!mine) return;
  document.documentElement.style.setProperty('--me', mine.color);
  $('myName').textContent = $('myName2').textContent = mine.name;
  for (const { c, b } of swatches) {
    b.classList.toggle('mine', c === mine.color);
    b.disabled = state.players.some(p => p.id !== mine.id && p.color === c);
  }
  show(state.phase === 'lobby' ? 'lobby' : 'playing');
});

// On every (re)connect, take our seat back with the saved token.
socket.on('connect', () => {
  $('banner').hidden = true;
  const seat = session.get<Seat>('kip.seat');
  if (seat) join(seat.code, seat.name, seat.token);
});
socket.on('disconnect', () => { $('banner').hidden = false; });
