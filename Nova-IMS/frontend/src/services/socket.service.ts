import { Injectable, signal, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { socketUrl } from '../utils/api-base';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket: Socket;
  private readonly authService = inject(AuthService);

  isConnected = signal(false);

  constructor() {
    this.socket = io(socketUrl(), {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      auth: {
        token: this.authService.getToken() || '',
      },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }

  on(eventName: string, callback: (data: unknown) => void): void {
    this.socket.on(eventName, callback);
  }

  off(eventName: string, callback?: (data: unknown) => void): void {
    this.socket.off(eventName, callback);
  }

  emit(eventName: string, data: unknown): void {
    this.socket.emit(eventName, data);
  }
}
