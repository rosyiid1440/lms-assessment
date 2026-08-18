import { IEventBus } from '../../../core/infrastructure/events/event-bus';
import { ASSIGNMENT_EVENTS } from '../../../modules/assignment/events/assignment.events';
// import { Server as WebSocketServer } from 'ws'; // Mocking WS import for structural example

export interface IRealtimeClient {
  userId: string;
  send(payload: string): void;
}

/**
 * Realtime Gateway.
 * Bridges the internal Event Bus with external WebSocket or SSE connections.
 */
export class RealtimeGateway {
  private connectedClients = new Map<string, IRealtimeClient[]>();

  constructor(private readonly eventBus: IEventBus) {
    this.setupSubscriptions();
  }

  // Called when a user opens the LMS Web App
  registerClient(client: IRealtimeClient) {
    const clients = this.connectedClients.get(client.userId) || [];
    clients.push(client);
    this.connectedClients.set(client.userId, clients);
  }

  /**
   * Translates internal domain events to public Realtime Socket Payloads.
   */
  private setupSubscriptions() {
    this.eventBus.subscribe(ASSIGNMENT_EVENTS.SUBMISSION_GRADED, async (event) => {
      // 1. Identify recipient from Event Payload
      const studentId = event.metadata.studentId;
      
      // 2. Format a public, safe payload (Do not send raw domain event data over WS)
      const socketPayload = JSON.stringify({
        type: 'NOTIFICATION',
        topic: 'GRADE_UPDATED',
        data: {
          assignmentId: event.metadata.assignmentId,
          message: 'Your assignment has been graded.'
        }
      });

      // 3. Push to all active devices of this student instantly
      this.pushToClient(studentId, socketPayload);
    });
    
    // Add more subscriptions... (Lesson Published, Message Received)
  }

  private pushToClient(userId: string, payload: string) {
    const clients = this.connectedClients.get(userId);
    if (clients) {
      for (const client of clients) {
        client.send(payload);
      }
    }
  }
}
