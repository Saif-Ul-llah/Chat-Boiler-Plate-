import { formatChatRoomsData, formatChatRoomsDataDetailed } from "../../helpers/filterModels.js";
import * as ChatRepo from "../repositories/chat.repo.js";

export const createRoom = async ({ creatorId, type, participantIds,listingId }) => {
  if (!participantIds.includes(creatorId)) {
    participantIds.push(creatorId); // Ensure creator is a participant
  }

  const newRoom = await ChatRepo.createRoomWithParticipants({
    type,
    participantIds,
    listingId
  });

  return newRoom;
};

export const findRoomByParticipants = async (participantIds, type,listingId) => {
  return await ChatRepo.findRoomWithExactParticipants(participantIds, type,listingId);
};

export const sendMessage = async (userId, roomId, content) => {
  const message = await ChatRepo.createMessage({ userId, roomId, content });
  return message;
};

export const fetchChatHistory = async (payload) => {
  const messages = await ChatRepo.getMessagesByRoomId(payload);
  return messages;
};

export const messageDelivered = async (messageId) => {
  const message = await ChatRepo.messageDelivered(messageId);
  return message;
};

export const messageRead = async (messageId) => {
  const message = await ChatRepo.messageRead(messageId);
  return message;
};

export const fetchUserRooms = async (userId) => {
  return formatChatRoomsDataDetailed(await ChatRepo.getRoomsByUserId(userId),userId);

};