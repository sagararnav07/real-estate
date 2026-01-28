import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { validators } from "../lib/validation";

// Get all conversations for a user
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const conversations = await prisma.conversation.findMany({
      where: userRole === "tenant" 
        ? { tenantCognitoId: userId }
        : { managerCognitoId: userId },
      include: {
        tenant: {
          select: { id: true, name: true, email: true, cognitoId: true },
        },
        manager: {
          select: { id: true, name: true, email: true, cognitoId: true },
        },
        property: {
          select: { id: true, name: true, photoUrls: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderCognitoId: { not: userId },
            status: { not: "Read" },
          },
        });
        return { ...conv, unreadCount };
      })
    );

    res.json(conversationsWithUnread);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Error fetching conversations" });
  }
};

// Get or create a conversation
export const getOrCreateConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { otherUserId, propertyId } = req.body;

    if (!userId || !userRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const tenantId = userRole === "tenant" ? userId : otherUserId;
    const managerId = userRole === "manager" ? userId : otherUserId;

    // Try to find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantCognitoId: tenantId,
        managerCognitoId: managerId,
        propertyId: propertyId || null,
      },
      include: {
        tenant: {
          select: { id: true, name: true, email: true, cognitoId: true },
        },
        manager: {
          select: { id: true, name: true, email: true, cognitoId: true },
        },
        property: {
          select: { id: true, name: true, photoUrls: true },
        },
      },
    });

    // Create new conversation if not exists
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantCognitoId: tenantId,
          managerCognitoId: managerId,
          propertyId: propertyId || null,
        },
        include: {
          tenant: {
            select: { id: true, name: true, email: true, cognitoId: true },
          },
          manager: {
            select: { id: true, name: true, email: true, cognitoId: true },
          },
          property: {
            select: { id: true, name: true, photoUrls: true },
          },
        },
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Error creating conversation" });
  }
};

// Get messages for a conversation
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { cursor, limit = "50" } = req.query;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const parsedLimit = parseInt(limit as string, 10);

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parseInt(conversationId, 10),
        OR: [
          { tenantCognitoId: userId },
          { managerCognitoId: userId },
        ],
      },
    });

    if (!conversation) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: parseInt(conversationId, 10),
        ...(cursor && { id: { lt: parseInt(cursor as string, 10) } }),
      },
      orderBy: { createdAt: "desc" },
      take: parsedLimit,
    });

    // Mark messages as read
    const unreadMessageIds = messages
      .filter(m => m.senderCognitoId !== userId && m.status !== "Read")
      .map(m => m.id);

    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { status: "Read", readAt: new Date() },
      });
    }

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === parsedLimit,
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
};

// Send a message (REST fallback, Socket.IO is preferred)
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { conversationId, content } = req.body;

    if (!userId || !userRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { tenantCognitoId: userId },
          { managerCognitoId: userId },
        ],
      },
    });

    if (!conversation) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderCognitoId: userId,
        senderRole: userRole,
        content,
        status: "Sent",
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Emit via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversationId}`).emit("message:new", message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
};

// Get unread message count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Get all conversations for user
    const conversations = await prisma.conversation.findMany({
      where: userRole === "tenant" 
        ? { tenantCognitoId: userId }
        : { managerCognitoId: userId },
      select: { id: true },
    });

    const conversationIds = conversations.map(c => c.id);

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderCognitoId: { not: userId },
        status: { not: "Read" },
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Error fetching unread count" });
  }
};

// Delete a conversation
export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parseInt(conversationId, 10),
        OR: [
          { tenantCognitoId: userId },
          { managerCognitoId: userId },
        ],
      },
    });

    if (!conversation) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Delete conversation (messages will cascade delete)
    await prisma.conversation.delete({
      where: { id: parseInt(conversationId, 10) },
    });

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: "Error deleting conversation" });
  }
};

