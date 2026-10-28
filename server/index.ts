// One process serves everything on one port: the TV page, the phone page, and the Socket.IO game channel.
import express from 'express';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import { Rooms, RoomError, type Room } from './rooms.ts';
import type { ClientToServer, ServerToClient } from '../shared/protocol.ts';

const PORT = Number(process.env.PORT ?? 3000);
const isProd = process.env.NODE_ENV === 'production';

interface SocketData { code?: string; role?: 'tv' | 'player'; playerId?: string }
type GameSocket = Socket<ClientToServer, ServerToClient, Record<string, never>, SocketData>;

/** The address phones should use. Prefers home-router ranges over virtual adapters (WSL, Hyper-V, VPNs). */
function lanAddress(): string {
  const all = Object.values(networkInterfaces()).flat()
    .filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a!.address);
  const rank = (ip: string) => ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('172.') ? 2 : 3;
  return all.sort((a, b) => rank(a) - rank(b))[0] ?? 'localhost';
}
const host = process.env.PUBLIC_HOST ?? lanAddress();
const joinUrl = (code: string) => `http://${host}:${PORT}/?r=${code}`;

const app = express();
const http = createServer(app);
const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(http);
const rooms = new Rooms();

app.get('/tv', (_req, res) => res.redirect('/tv.html'));
if (isProd) {
  app.use(express.static(fileURLToPath(new URL('../dist/client/', import.meta.url))));
} else {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({ server: { middlewareMode: true, hmr: false }, appType: 'mpa' });
  app.use(vite.middlewares);
}

const log = (room: Room, msg: string) => console.log(`[${room.code}] ${msg}`);

function broadcast(room: Room) {
  io.to(room.code).emit('room:state', rooms.publicState(room, joinUrl(room.code)));
}

/** Wraps a handler so bad input or a thrown error answers the caller instead of crashing the server. */
/** Payloads are typed for convenience, but they come off the network, so handlers still treat them as untrusted. */
function safe<F extends (...args: any[]) => void>(fn: F): F {
  return ((...args: unknown[]) => {
    const cb = args.at(-1);
    if (typeof cb !== 'function') return; // every client call expects an answer; ignore malformed ones
    try {
      fn(...args);
    } catch (err) {
      if (!(err instanceof RoomError)) console.error(err);
      cb({ ok: false, error: err instanceof RoomError ? err.message : 'Something went wrong.' });
    }
  }) as F;
}

function roomOf(socket: GameSocket, role: 'tv' | 'player'): Room {
  const room = socket.data.code ? rooms.get(socket.data.code) : undefined;
  if (!room || socket.data.role !== role) throw new RoomError('Not connected to a game.');
  return room;
}

function attachTv(socket: GameSocket, room: Room) {
  room.tvSocketId = socket.id;
  socket.data = { code: room.code, role: 'tv' };
  socket.join(room.code);
}

io.on('connection', (socket: GameSocket) => {
  socket.on('tv:create', safe(cb => {
    const room = rooms.create();
    attachTv(socket, room);
    log(room, `created by a TV (${socket.handshake.headers['user-agent']?.match(/Firefox|Edg|Chrome|Safari/)?.[0] ?? 'browser'})`);
    cb({ ok: true, code: room.code, tvToken: room.tvToken });
    broadcast(room);
  }));

  socket.on('tv:resume', safe((p, cb) => {
    const room = rooms.resumeTv(p?.code, p?.tvToken);
    attachTv(socket, room);
    cb({ ok: true, code: room.code, tvToken: room.tvToken });
    broadcast(room);
  }));

  socket.on('tv:start', safe(cb => {
    const room = roomOf(socket, 'tv');
    rooms.start(room);
    cb({ ok: true });
    broadcast(room);
  }));

  socket.on('player:join', safe((p, cb) => {
    const { room, player } = rooms.join(p?.code, p?.name, p?.token);
    player.socketId = socket.id;
    socket.data = { code: room.code, role: 'player', playerId: player.id };
    socket.join(room.code);
    log(room, `${player.name} joined from ${socket.handshake.address} (${room.players.length} players)`);
    cb({ ok: true, playerId: player.id, token: player.token });
    broadcast(room);
  }));

  socket.on('player:color', safe((p, cb) => {
    const room = roomOf(socket, 'player');
    rooms.setColor(room, socket.data.playerId!, p?.color);
    cb({ ok: true });
    broadcast(room);
  }));

  socket.on('disconnect', () => {
    const room = socket.data.code ? rooms.get(socket.data.code) : undefined;
    if (!room) return;
    if (socket.data.role === 'tv' && room.tvSocketId === socket.id) room.tvSocketId = undefined;
    const player = room.players.find(p => p.id === socket.data.playerId);
    // Only the player's latest socket counts. An old socket closing after a reconnect must not mark them offline.
    if (player && player.socketId === socket.id) {
      player.connected = false;
      log(room, `${player.name} dropped`);
      broadcast(room);
    }
  });
});

setInterval(() => rooms.sweep(30 * 60_000), 60_000).unref();

http.listen(PORT, '0.0.0.0', () => {
  console.log(`KiP Revamped is running.`);
  console.log(`  TV:     http://localhost:${PORT}/tv`);
  console.log(`  Phones: http://${host}:${PORT}/   (same Wi-Fi)`);
});
