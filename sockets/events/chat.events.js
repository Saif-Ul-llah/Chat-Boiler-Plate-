import { socketAuth } from "../../middlewares/socketAuth.middleware.js";
import * as ChatSocketController from "../controllers/chat.socketController.js";

export default (socket, io) => {
//   io.use(socketAuth);
  socket.on("joinOrCreateRoom", (data) => ChatSocketController.joinOrCreateRoom(io,socket, data));
  socket.on("send_message", (data) => ChatSocketController.sendMessage(io, socket, data));
  socket.on("getChatHistory", (data) => ChatSocketController.getChatHistory(socket, data));
  socket.on("message-delivered", (data) => ChatSocketController.messageDelivered(io, socket, data));
  socket.on("message-read",(data) => ChatSocketController.messageRead(io, socket, data));
  socket.on("get_user_rooms", () => ChatSocketController.getUserRooms(io,socket));


};
