import express from "express";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  deleteConversation,
} from "../controllers/messageControllers";

const router = express.Router();

// Get all conversations for current user
router.get("/conversations", getConversations);

// Get or create a conversation
router.post("/conversations", getOrCreateConversation);

// Get messages for a conversation
router.get("/conversations/:conversationId/messages", getMessages);

// Send a message (REST fallback)
router.post("/send", sendMessage);

// Get unread message count
router.get("/unread-count", getUnreadCount);

// Delete a conversation
router.delete("/conversations/:conversationId", deleteConversation);

export default router;
