/**
 * Realtime stub — Phase 6.
 * MySQL remains source of truth; realtime only pushes events.
 */

export type RealtimeEvent = {
  workspaceId: string;
  type: string;
  payload: Record<string, unknown>;
};

export async function publishRealtimeEvent(_event: RealtimeEvent): Promise<void> {
  // no-op until websocket/SSE layer exists
}
