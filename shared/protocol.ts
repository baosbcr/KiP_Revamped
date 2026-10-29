// Messages between the server, the TV page and the phone pages.
// The server is the referee: clients send intents, and the server answers and broadcasts room state.

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const NAME_MAX = 16;
/** Face masks are small JPEG data URLs (a 320 px square is ~40 kB). This cap leaves headroom and blocks abuse. */
export const MASK_MAX_CHARS = 300_000;
export const MASK_SIZE = 320;
export const PLAYER_COLORS = [
  '#e8553d', '#f2a33a', '#f5d547', '#5cc46b', '#3fb5c9', '#4f7be8', '#9a62e0', '#e85fa8',
] as const;

export type Phase = 'lobby' | 'playing';

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  hasMask: boolean;
  /** Locked in: name, colour and face are final, and the player is waiting for the host to start. */
  ready: boolean;
}

export interface RoomState {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  joinUrl: string;
}

export type Ack = { ok: true } | { ok: false; error: string };
export type TvAck = { ok: true; code: string; tvToken: string } | { ok: false; error: string };
export type JoinAck = { ok: true; playerId: string; token: string } | { ok: false; error: string };

export interface ClientToServer {
  'tv:create': (cb: (r: TvAck) => void) => void;
  'tv:resume': (p: { code: string; tvToken: string }, cb: (r: TvAck) => void) => void;
  'tv:start': (cb: (r: Ack) => void) => void;
  'player:join': (p: { code: string; name: string; token?: string }, cb: (r: JoinAck) => void) => void;
  'player:color': (p: { color: string }, cb: (r: Ack) => void) => void;
  /** A face photo as a JPEG data URL, already cropped square on the phone. null removes it. */
  'player:mask': (p: { dataUrl: string | null }, cb: (r: Ack) => void) => void;
  /** Lock in (needs a face) or unlock to change your look. */
  'player:ready': (p: { ready: boolean }, cb: (r: Ack) => void) => void;
}

export interface ServerToClient {
  'room:state': (s: RoomState) => void;
  /** Sent only to the TV, plus the player's own phone. Images are too heavy to repeat in every room:state. */
  'room:mask': (p: { playerId: string; dataUrl: string | null }) => void;
}
