import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface GraphUpdatePayload {
  userId: number;
}

export interface NewMessagePayload {
  toId: number;
  fromId: number;
}

@Injectable()
export class GraphEventsService implements OnModuleDestroy {
  private emitter = new EventEmitter();

  emitGraphUpdate(payload: GraphUpdatePayload): void {
    this.emitter.emit('graph_update', payload);
  }

  emitNewMessage(payload: NewMessagePayload): void {
    this.emitter.emit('new_msg', payload);
  }

  onGraphUpdate(listener: (payload: GraphUpdatePayload) => void): void {
    this.emitter.on('graph_update', listener);
  }

  onNewMessage(listener: (payload: NewMessagePayload) => void): void {
    this.emitter.on('new_msg', listener);
  }

  onModuleDestroy(): void {
    this.emitter.removeAllListeners();
  }
}
