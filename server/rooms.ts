// Room and player bookkeeping. Pure logic with no sockets, so it can be unit-tested.
import { randomBytes, randomUUID } from 'node:crypto';
import {
  MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, PLAYER_COLORS, type Phase, type RoomState,
} from '../shared/protocol.ts';

// No I or O: they're easy to confuse with 1 and 0 when typing the code on a phone.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/** An error whose message is safe to show to the player. */
export class RoomError extends Error {}

export interface Player {
  id: string;
  token: string;
  name: string;
  color: string;
  connected: boolean;
  socketId?: string;
}

export interface Room {
  code: string;
  tvToken: string;
  tvSocketId?: string;
  phase: Phase;
  players: Player[];
  lastActivity: number;
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function cleanCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

export class Rooms {
  private rooms = new Map<string, Room>();

  constructor(private now: () => number = Date.now) {}

  create(): Room {
    let code: string;
    do {
      code = Array.from(randomBytes(4), b => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
    } while (this.rooms.has(code));
    const room: Room = { code, tvToken: randomUUID(), phase: 'lobby', players: [], lastActivity: this.now() };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(cleanCode(code));
  }

  private require(code: unknown): Room {
    const room = this.rooms.get(cleanCode(code));
    if (!room) throw new RoomError('No game with that code.');
    room.lastActivity = this.now();
    return room;
  }

  resumeTv(code: unknown, tvToken: unknown): Room {
    const room = this.require(code);
    if (tvToken !== room.tvToken) throw new RoomError('That screen no longer owns this game.');
    return room;
  }

  /**
   * Adds a player, or reconnects one. A matching token always reconnects. Failing that, a disconnected
   * player's name can be reclaimed, which covers a phone that lost its tab.
   */
  join(code: unknown, rawName: unknown, token?: unknown): { room: Room; player: Player } {
    const room = this.require(code);
    const byToken = typeof token === 'string' ? room.players.find(p => p.token === token) : undefined;
    if (byToken) {
      byToken.connected = true;
      return { room, player: byToken };
    }

    const name = cleanName(rawName);
    if (!name) throw new RoomError('Pick a name first.');
    const sameName = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (sameName) {
      if (sameName.connected) throw new RoomError('That name is taken.');
      sameName.connected = true;
      return { room, player: sameName };
    }

    if (room.phase !== 'lobby') throw new RoomError('This game has already started.');
    if (room.players.length >= MAX_PLAYERS) throw new RoomError(`The game is full (${MAX_PLAYERS} players).`);

    const used = new Set(room.players.map(p => p.color));
    const color = PLAYER_COLORS.find(c => !used.has(c)) ?? PLAYER_COLORS[0];
    const player: Player = { id: randomUUID(), token: randomUUID(), name, color, connected: true };
    room.players.push(player);
    return { room, player };
  }

  setColor(room: Room, playerId: string, color: unknown): void {
    if (typeof color !== 'string' || !(PLAYER_COLORS as readonly string[]).includes(color)) {
      throw new RoomError('Unknown colour.');
    }
    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new RoomError('You are not in this game.');
    if (room.players.some(p => p !== player && p.color === color)) throw new RoomError('Someone already has that colour.');
    player.color = color;
  }

  start(room: Room): void {
    if (room.phase !== 'lobby') throw new RoomError('The game has already started.');
    const ready = room.players.filter(p => p.connected).length;
    if (ready < MIN_PLAYERS) throw new RoomError(`Need at least ${MIN_PLAYERS} players.`);
    room.phase = 'playing';
  }

  publicState(room: Room, joinUrl: string): RoomState {
    return {
      code: room.code,
      phase: room.phase,
      joinUrl,
      players: room.players.map(({ id, name, color, connected }) => ({ id, name, color, connected })),
    };
  }

  /** Drops rooms that nobody has touched for `maxIdleMs` and that have no TV and no connected players. */
  sweep(maxIdleMs: number): string[] {
    const removed: string[] = [];
    for (const room of this.rooms.values()) {
      const empty = !room.tvSocketId && room.players.every(p => !p.connected);
      if (empty && this.now() - room.lastActivity > maxIdleMs) {
        this.rooms.delete(room.code);
        removed.push(room.code);
      }
    }
    return removed;
  }
}
