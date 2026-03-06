import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export function createSocket(token) {
  return io(SOCKET_URL, {
    auth: { token }, // server reads socket.handshake.auth.token
    transports: ["websocket"],
  });
}
