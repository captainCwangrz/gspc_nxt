import { OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GraphEventsService } from './graph-events.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class GraphGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly graphEvents: GraphEventsService) {}

  onModuleInit(): void {
    this.graphEvents.onGraphUpdate((payload) => {
      this.server.emit('graph_update', payload);
    });

    this.graphEvents.onNewMessage((payload) => {
      this.server.emit('new_msg', payload);
    });
  }
}
