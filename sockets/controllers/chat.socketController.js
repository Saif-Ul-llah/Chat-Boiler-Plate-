import { findRoomById } from "../repositories/chat.repo.js";
import * as ChatService from "../services/chat.service.js";

export const joinOrCreateRoom = async (io, socket, data) => {
  // console.log(data,"runs fine");

  try {
    const { type, participantIds, listingId = "" } = data;

    if (!type || participantIds.length === 0) {
      socket.emit("error", {
        message: "Please provide both chat type and participant ID.",
      });
      return;
    }
    if (type == "LISTING" && !listingId) {
      socket.emit("error", {
        message: "Please provide listing ID.",
      });
      return;
    }
    // Ensure current user is included
    if (!participantIds.includes(socket.userId)) {
      participantIds.push(socket.userId);
    }

    // Check if room exists
    const existingRoom = await ChatService.findRoomByParticipants(
      participantIds,
      type,
      listingId
    );

    if (existingRoom) {
      socket.join(existingRoom.id);
      socket.emit("room_joined", existingRoom);
      return;
    } else {
      const newRoom = await ChatService.createRoom({
        creatorId: socket.userId,
        type,
        participantIds,
        listingId,
      });

      participantIds.forEach((participantId) => {
        if (participantId !== socket.userId) {
          io.to(`user:${participantId}`).emit("new_room", newRoom);
        }
      });

      socket.join(newRoom.id);
      socket.emit("room_created", newRoom);
    }
  } catch (error) {
    socket.emit("error", { message: error.message });
  }
};

export const sendMessage = async (io, socket, { roomId, content }) => {
  try {
    if (!roomId || !content) {
      socket.emit("error", { message: "Room ID is required" });
      return;
    }

    const room = await findRoomById(roomId);
    const message = await ChatService.sendMessage(
      socket.userId,
      roomId,
      content
    );

    // Emit to all connected sockets in the room
    io.to(roomId).emit("receive_message", message);

    // Get socket IDs in the room
    const connectedSockets = io.sockets.adapter.rooms.get(roomId) || new Set();

    // Build a map of socket.id -> userId for all connected sockets
    const userIdToSocketIdMap = new Map();
    for (const [id, s] of io.sockets.sockets) {
      userIdToSocketIdMap.set(s.userId, id);
    }

    // Notify users who are not currently connected to the room
    for (const participant of room.participants) {
      if (participant.userId !== socket.userId) {
        const participantSocketId = userIdToSocketIdMap.get(participant.userId);
        if (!connectedSockets.has(participantSocketId)) {
          io.to(`user:${participant.userId}`).emit("notify", message);
        }
      }
    }
  } catch (err) {
    socket.emit("error", { message: err.message });
  }
};

export const getChatHistory = async (
  socket,
  { roomId, page = 1, pageSize = 10 }
) => {
  try {
    const messages = await ChatService.fetchChatHistory({
      roomId,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
    socket.emit("chat_history", { roomId, messages });
  } catch (error) {
    socket.emit("error", { message: "Failed to fetch chat history" });
  }
};

export const messageDelivered = async (io, socket, { messageId }) => {
  try {
    // console.log(messageId, "messageIdeee");
    
    const message = await ChatService.messageDelivered(messageId);
    // console.log(message, "messageeeeee");
    
    io.to(message.roomId).emit("message_delivered", message);
    io.to(message.senderId).emit("message-status-updated", {
      messageId: message.id,
      status: "DELIVERED",
      userId: socket.userId,
    });
  } catch (error) {
    socket.emit("error", { message: "na baba na Failed to mark message as delivered" });
  }
};

export const messageRead = async (io, socket, { messageId }) => {
  try {
    // console.log(messageId, "messageIdeee");
    
    if (!messageId||messageId.length == 0) {
      // socket.emit("error", { message: "Message ID is required" });
      return;
    }
    const message = await ChatService.messageRead(messageId);
    io.to(message.roomId).emit("message_read", message);
  } catch (error) {
    socket.emit("error", { message: "Failed to mark message as read" });
  }
};

export const getUserRooms = async (io, socket) => {
  try {
    const rooms = await ChatService.fetchUserRooms(socket.userId);
    socket.emit("room_list", rooms);
  } catch (err) {
    socket.emit("error", { message: "Failed to fetch room list" });
  }
};
