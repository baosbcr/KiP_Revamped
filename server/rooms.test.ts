import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, RoomError, cleanName } from './rooms.ts';
import { MAX_PLAYERS } from '../shared/protocol.ts';

test('room codes are 4 letters with no I or O', () => {
  const rooms = new Rooms();
  for (let i = 0; i < 200; i++) assert.match(rooms.create().code, /^[A-HJ-NP-Z]{4}$/);
});

test('players get unique colours, and the room caps at MAX_PLAYERS', () => {
  const rooms = new Rooms();
  const { code } = rooms.create();
  for (let i = 0; i < MAX_PLAYERS; i++) rooms.join(code, `P${i}`);
  const colours = new Set(rooms.get(code)!.players.map(p => p.color));
  assert.equal(colours.size, MAX_PLAYERS);
  assert.throws(() => rooms.join(code, 'Late'), RoomError);
});

test('codes are case-insensitive and names are cleaned', () => {
  const rooms = new Rooms();
  const { code } = rooms.create();
  const { player } = rooms.join(code.toLowerCase(), '  Ana \n  Maria  ');
  assert.equal(player.name, 'Ana Maria');
  assert.equal(cleanName('x'.repeat(40)).length, 16);
  assert.throws(() => rooms.join(code, '   '), /name/);
  assert.throws(() => rooms.join('ZZZZ', 'Bo'), /No game/);
});

test('a token reconnects the same player', () => {
  const rooms = new Rooms();
  const { code } = rooms.create();
  const { player } = rooms.join(code, 'Rui');
  player.connected = false;
  const again = rooms.join(code, 'whatever', player.token).player;
  assert.equal(again.id, player.id);
  assert.equal(again.connected, true);
});

test('a name can be reclaimed only while its player is disconnected', () => {
  const rooms = new Rooms();
  const { code } = rooms.create();
  const { player } = rooms.join(code, 'Joao');
  assert.throws(() => rooms.join(code, 'joao'), /taken/);
  player.connected = false;
  assert.equal(rooms.join(code, 'JOAO').player.id, player.id);
});

test('newcomers cannot join after the start, but dropped players can rejoin', () => {
  const rooms = new Rooms();
  const room = rooms.create();
  const a = rooms.join(room.code, 'A').player;
  rooms.join(room.code, 'B');
  rooms.start(room);
  assert.throws(() => rooms.join(room.code, 'C'), /started/);
  a.connected = false;
  assert.equal(rooms.join(room.code, 'A').player.id, a.id);
});

test('start needs two connected players', () => {
  const rooms = new Rooms();
  const room = rooms.create();
  rooms.join(room.code, 'A');
  const b = rooms.join(room.code, 'B').player;
  b.connected = false;
  assert.throws(() => rooms.start(room), /at least 2/);
  b.connected = true;
  rooms.start(room);
  assert.equal(room.phase, 'playing');
});

test('colours must be from the palette and free', () => {
  const rooms = new Rooms();
  const room = rooms.create();
  const a = rooms.join(room.code, 'A').player;
  const b = rooms.join(room.code, 'B').player;
  assert.throws(() => rooms.setColor(room, b.id, a.color), /already/);
  assert.throws(() => rooms.setColor(room, b.id, '#000000'), /Unknown/);
  rooms.setColor(room, b.id, '#e85fa8');
  assert.equal(b.color, '#e85fa8');
});

test('masks accept small image data URLs only, and can be removed', () => {
  const rooms = new Rooms();
  const room = rooms.create();
  const a = rooms.join(room.code, 'A').player;
  const jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
  rooms.setMask(room, a.id, jpeg);
  assert.equal(rooms.publicState(room, '').players[0].hasMask, true);
  assert.throws(() => rooms.setMask(room, a.id, 'data:text/html;base64,AAAA'), /photo/);
  assert.throws(() => rooms.setMask(room, a.id, 'data:image/jpeg;base64,<script>'), /photo/);
  assert.throws(() => rooms.setMask(room, a.id, 'data:image/jpeg;base64,' + 'A'.repeat(400_000)), /photo/);
  assert.throws(() => rooms.setMask(room, 'nobody', jpeg), /not in this game/);
  rooms.setMask(room, a.id, null);
  assert.equal(rooms.publicState(room, '').players[0].hasMask, false);
});

test('sweep removes only idle, empty rooms', () => {
  let t = 0;
  const rooms = new Rooms(() => t);
  const idle = rooms.create();
  const busy = rooms.create();
  rooms.join(busy.code, 'A');
  t = 10_000;
  assert.deepEqual(rooms.sweep(5_000), [idle.code]);
  assert.ok(rooms.get(busy.code));
});

test('the TV can resume only with its token', () => {
  const rooms = new Rooms();
  const room = rooms.create();
  assert.equal(rooms.resumeTv(room.code, room.tvToken), room);
  assert.throws(() => rooms.resumeTv(room.code, 'nope'), /no longer/);
});
