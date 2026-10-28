import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '../shared/protocol.ts';

export type GameSocket = Socket<ServerToClient, ClientToServer>;

// Same origin as the page. Socket.IO reconnects by itself, and each page re-identifies itself on 'connect'.
export const socket: GameSocket = io();

/** Storage that never throws (private mode, blocked site data). Session = this tab, local = this browser. */
function safeStore(kind: 'sessionStorage' | 'localStorage') {
  const s = () => { try { return window[kind]; } catch { return undefined; } };
  return {
    get<T>(key: string): T | undefined {
      try { const v = s()?.getItem(key); return v ? JSON.parse(v) as T : undefined; } catch { return undefined; }
    },
    set(key: string, value: unknown) { try { s()?.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } },
    remove(key: string) { try { s()?.removeItem(key); } catch { /* ignore */ } },
  };
}
export const session = safeStore('sessionStorage');
export const local = safeStore('localStorage');
