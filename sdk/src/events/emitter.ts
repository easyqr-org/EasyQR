type Handler<TPayload> = (payload: TPayload) => void;

export interface Emitter<EventMap extends object> {
  on<TEvent extends keyof EventMap>(
    event: TEvent,
    handler: Handler<EventMap[TEvent]>
  ): void;
  off<TEvent extends keyof EventMap>(
    event: TEvent,
    handler: Handler<EventMap[TEvent]>
  ): void;
  emit<TEvent extends keyof EventMap>(event: TEvent, payload: EventMap[TEvent]): void;
  clear(): void;
}

export function createEmitter<EventMap extends object>(): Emitter<EventMap> {
  const handlers = new Map<keyof EventMap, Set<Handler<unknown>>>();

  return {
    on(event, handler) {
      const existing = handlers.get(event);
      if (existing) {
        existing.add(handler as Handler<unknown>);
        return;
      }
      handlers.set(event, new Set([handler as Handler<unknown>]));
    },
    off(event, handler) {
      const existing = handlers.get(event);
      if (!existing) return;
      existing.delete(handler as Handler<unknown>);
      if (existing.size === 0) {
        handlers.delete(event);
      }
    },
    emit(event, payload) {
      const existing = handlers.get(event);
      if (!existing || existing.size === 0) return;
      for (const handler of existing) {
        try {
          handler(payload);
        } catch {
          // Isolate listener errors to keep emitter stable.
        }
      }
    },
    clear() {
      handlers.clear();
    },
  };
}
