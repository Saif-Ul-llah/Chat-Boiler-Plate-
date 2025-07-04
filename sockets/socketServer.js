import { Server } from "socket.io";
import chatEvents from "./events/chat.events.js";
import { socketAuth } from "../middlewares/socketAuth.middleware.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"],
    },
  });

  // Optional auth middleware
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);

    // Join user to their personal room for direct emits
    socket.join(`user:${socket.userId}`);

    // Register all event listeners
    chatEvents(socket, io);

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

// Optional getter for accessing io instance globally
export const getIO = () => io;
