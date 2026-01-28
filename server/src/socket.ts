import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Store online users: { cognitoId: socketId }
const onlineUsers = new Map<string, string>();

export const setupSocketIO = (io: SocketIOServer) => {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
        userId: string;
        role: string;
      };
      
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${userId} (${userRole})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);

    // Join a personal room for private messages
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit("user:online", { userId, online: true });

    // Handle joining a conversation room
    socket.on("conversation:join", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Handle leaving a conversation room
    socket.on("conversation:leave", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle sending a message
    socket.on("message:send", async (data: {
      conversationId: number;
      content: string;
      receiverId: string;
    }) => {
      try {
        const { conversationId, content, receiverId } = data;

        // Create message in database
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderCognitoId: userId,
            senderRole: userRole || "tenant",
            content,
            status: "Sent",
          },
        });

        // Update conversation's lastMessageAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        // Check if receiver is online
        const receiverSocketId = onlineUsers.get(receiverId);
        
        // Emit to the conversation room
        io.to(`conversation:${conversationId}`).emit("message:new", {
          ...message,
          senderCognitoId: userId,
        });

        // If receiver is online but not in conversation room, notify them
        if (receiverSocketId) {
          // Update message status to Delivered
          await prisma.message.update({
            where: { id: message.id },
            data: { status: "Delivered" },
          });

          io.to(`user:${receiverId}`).emit("message:notification", {
            conversationId,
            message: {
              ...message,
              status: "Delivered",
            },
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    // Handle typing indicator
    socket.on("typing:start", (data: { conversationId: number; receiverId: string }) => {
      io.to(`conversation:${data.conversationId}`).emit("typing:update", {
        userId,
        conversationId: data.conversationId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (data: { conversationId: number; receiverId: string }) => {
      io.to(`conversation:${data.conversationId}`).emit("typing:update", {
        userId,
        conversationId: data.conversationId,
        isTyping: false,
      });
    });

    // Handle marking messages as read
    socket.on("messages:read", async (data: { conversationId: number; messageIds: number[] }) => {
      try {
        const { conversationId, messageIds } = data;

        // Update messages to read status
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
            senderCognitoId: { not: userId }, // Only mark others' messages as read
          },
          data: {
            status: "Read",
            readAt: new Date(),
          },
        });

        // Notify the conversation room about read receipts
        io.to(`conversation:${conversationId}`).emit("messages:read:update", {
          conversationId,
          messageIds,
          readBy: userId,
          readAt: new Date(),
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      io.emit("user:online", { userId, online: false });
    });
  });
};

// Helper function to check if a user is online
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// Helper function to get online users
export const getOnlineUsers = (): string[] => {
  return Array.from(onlineUsers.keys());
};
