import { prisma } from "../../prismaClient.js";

//  ============================= Find room by Id =============================
export const findRoomById = async (id) => {
  return await prisma.chat.findUnique({
    where: { id },
    include: { participants: true },
  });
};

// ============================= Send Message =============================
export const createMessage = async ({ userId, roomId, content }) => {
  return await prisma.message.create({
    data: { senderId: userId, chatId: roomId, content },
    include: {
      sender: { select: { fullName: true, id: true, profile: true } },
    },
  });
};

// ============================= Create chat Room =============================
export const createRoomWithParticipants = async ({
  type,
  participantIds,
  listingId,
}) => {
  // console.log("\n\n listing id :",listingId);

  try {
    return await prisma.chat.create({
      data: {
        type,
        ...(listingId && { listing: { connect: { id: listingId } } }),
        participants: {
          create: participantIds.map((userId) => ({
            user: { connect: { id: userId } },
          })),
        },
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

// ============================= Find room by participants =============================
export const findRoomWithExactParticipants = async (
  participantIds,
  type,
  listingId
) => {
  const rooms = await prisma.chat.findMany({
    where: {
      type,
      ...(listingId && { listingId }),
      participants: {
        every: {
          userId: { in: participantIds },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  // Manually filter to match EXACTLY the same participants
  return rooms.find((room) => {
    const roomUserIds = room.participants.map((p) => p.userId).sort();
    const inputUserIds = [...participantIds].sort();
    return JSON.stringify(roomUserIds) === JSON.stringify(inputUserIds);
  });
};

// ============================= Get Room messages =============================
export const getMessagesByRoomId = async ({ roomId, page, pageSize }) => {
  const validPage = Math.max(page, 1);
  const skip = (validPage - 1) * pageSize;

  const total = await prisma.message.count({
    where: { chatId: roomId },
  });
  let messages = await prisma.message.findMany({
    where: { chatId: roomId },
    orderBy: { createdAt: "desc" },
    skip: skip || 0,
    take: pageSize,
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          fullName: true,
          profile: { select: { profileImage: true } },
        },
      },
    },
  });

  return {
    messages,
    currentPage: page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ============================ Message Delivered ============================
export const messageDelivered = async (messageId) => {
  return await prisma.message.update({
    where: { id: messageId },
    data: { status: "DELIVERED" },
  });
};

// ============================ Message Read ============================
export const messageRead = async (messageIds) => {
 try {
  // console.log(messageIds, "messageIds\n\n\n\n");
  
  return await prisma.message.updateMany({
    where: { id: { in: messageIds } },
    data: { status: "READ" },
  });
 } catch (error) {
  console.log(error);
  throw error;
 }
 
};

// ============================ Get Room List ============================
export const getRoomsByUserId = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    includeTotal = false
  } = options;

  const skip = (page - 1) * limit;

  // For better performance with large datasets, you might want to:
  // 1. Add an index on chat.updatedAt
  // 2. Update chat.updatedAt whenever a new message is added
  // 3. Use database-level ordering instead of JavaScript sorting

  const [rooms, totalCount] = await Promise.all([
    prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                OR: [{ status: "SENT" }, { status: "DELIVERED" }],
                senderId: {
                  not: userId,
                },
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                profile: {
                  select: {
                    profileImage: true,
                  },
                },
              },
            },
          },
          take: 1,
        },
      },
      // If you have updatedAt field that gets updated with each message:
      // orderBy: { updatedAt: "desc" },
      // skip,
      // take: limit,
    }),
    includeTotal ? prisma.chat.count({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
    }) : Promise.resolve(0)
  ]);

  // Sort and paginate (same logic as above)
  const sortedRooms = rooms.sort((a, b) => {
    const aLastMessageTime = a.messages?.[0]?.createdAt;
    const bLastMessageTime = b.messages?.[0]?.createdAt;

    if (aLastMessageTime && bLastMessageTime) {
      return new Date(bLastMessageTime) - new Date(aLastMessageTime);
    }
    if (aLastMessageTime && !bLastMessageTime) return -1;
    if (!aLastMessageTime && bLastMessageTime) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const paginatedRooms = sortedRooms.slice(skip, skip + limit);
  const totalPages = Math.ceil(sortedRooms.length / limit);

  return {
    data: paginatedRooms,
    pagination: {
      currentPage: page,
      limit,
      total: includeTotal ? totalCount : sortedRooms.length,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      startIndex: skip + 1,
      endIndex: Math.min(skip + limit, sortedRooms.length),
    },
  };
};
