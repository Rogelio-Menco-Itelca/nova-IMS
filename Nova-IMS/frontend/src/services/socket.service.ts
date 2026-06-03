import { Injectable, signal, inject } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { AuthService } from "./auth.service";

const SOCKET_URL = "http://localhost:3000";

@Injectable({ providedIn: "root" })
export class SocketService {
  private socket: Socket;
  private authService = inject(AuthService);

  isConnected = signal(false);

  constructor() {
    this.socket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      auth: {
        token: this.authService.getToken() || "",
      },
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      this.isConnected.set(true);
    });

    this.socket.on("disconnect", () => {
      this.isConnected.set(false);
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  }

  on(eventName: string, callback: (data: any) => void): void {
    this.socket.on(eventName, callback);
  }

  off(eventName: string, callback?: (data: any) => void): void {
    this.socket.off(eventName, callback);
  }

  emit(eventName: string, data: any): void {
    this.socket.emit(eventName, data);
  }
}
