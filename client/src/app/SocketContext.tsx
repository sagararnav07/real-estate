"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/app/(auth)/AuthContext";

interface Message {
  id: number;
  conversationId: number;
  senderCognitoId: string;
  senderRole: string;
  content: string;
  status: "Sent" | "Delivered" | "Read";
  createdAt: string;
  readAt?: string;
}

interface TypingState {
  [conversationId: number]: {
    userId: string;
    isTyping: boolean;
  };
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingStates: TypingState;
  sendMessage: (conversationId: number, content: string, receiverId: string) => void;
  joinConversation: (conversationId: number) => void;
  leaveConversation: (conversationId: number) => void;
  startTyping: (conversationId: number, receiverId: string) => void;
  stopTyping: (conversationId: number, receiverId: string) => void;
  markMessagesAsRead: (conversationId: number, messageIds: number[]) => void;
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onMessageNotification: (callback: (data: { conversationId: number; message: Message }) => void) => () => void;
  onMessagesRead: (callback: (data: { conversationId: number; messageIds: number[]; readBy: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, getToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingStates, setTypingStates] = useState<TypingState>({});
  
  // Use refs for callbacks to avoid re-renders
  const messageCallbacksRef = useRef<Set<(message: Message) => void>>(new Set());
  const notificationCallbacksRef = useRef<Set<(data: { conversationId: number; message: Message }) => void>>(new Set());
  const readCallbacksRef = useRef<Set<(data: { conversationId: number; messageIds: number[]; readBy: string }) => void>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    // Get the base URL and ensure it doesn't have a trailing slash or path
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002").replace(/\/$/, "").replace(/\/api$/, "");

    const socketInstance = io(baseUrl, {
      auth: { token },
      transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      withCredentials: true,
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    // Handle online status updates
    socketInstance.on("user:online", ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (online) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });

    // Handle new messages
    socketInstance.on("message:new", (message: Message) => {
      messageCallbacksRef.current.forEach((callback) => callback(message));
    });

    // Handle message notifications (for users not in conversation room)
    socketInstance.on("message:notification", (data: { conversationId: number; message: Message }) => {
      notificationCallbacksRef.current.forEach((callback) => callback(data));
    });

    // Handle typing updates
    socketInstance.on("typing:update", ({ userId, conversationId, isTyping }) => {
      setTypingStates((prev) => ({
        ...prev,
        [conversationId]: { userId, isTyping },
      }));
    });

    // Handle read receipts
    socketInstance.on("messages:read:update", (data: { conversationId: number; messageIds: number[]; readBy: string }) => {
      readCallbacksRef.current.forEach((callback) => callback(data));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, getToken]);

  const sendMessage = useCallback((conversationId: number, content: string, receiverId: string) => {
    if (socket) {
      socket.emit("message:send", { conversationId, content, receiverId });
    }
  }, [socket]);

  const joinConversation = useCallback((conversationId: number) => {
    if (socket) {
      socket.emit("conversation:join", conversationId);
    }
  }, [socket]);

  const leaveConversation = useCallback((conversationId: number) => {
    if (socket) {
      socket.emit("conversation:leave", conversationId);
    }
  }, [socket]);

  const startTyping = useCallback((conversationId: number, receiverId: string) => {
    if (socket) {
      socket.emit("typing:start", { conversationId, receiverId });
    }
  }, [socket]);

  const stopTyping = useCallback((conversationId: number, receiverId: string) => {
    if (socket) {
      socket.emit("typing:stop", { conversationId, receiverId });
    }
  }, [socket]);

  const markMessagesAsRead = useCallback((conversationId: number, messageIds: number[]) => {
    if (socket) {
      socket.emit("messages:read", { conversationId, messageIds });
    }
  }, [socket]);

  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    messageCallbacksRef.current.add(callback);
    return () => {
      messageCallbacksRef.current.delete(callback);
    };
  }, []);

  const onMessageNotification = useCallback((callback: (data: { conversationId: number; message: Message }) => void) => {
    notificationCallbacksRef.current.add(callback);
    return () => {
      notificationCallbacksRef.current.delete(callback);
    };
  }, []);

  const onMessagesRead = useCallback((callback: (data: { conversationId: number; messageIds: number[]; readBy: string }) => void) => {
    readCallbacksRef.current.add(callback);
    return () => {
      readCallbacksRef.current.delete(callback);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingStates,
        sendMessage,
        joinConversation,
        leaveConversation,
        startTyping,
        stopTyping,
        markMessagesAsRead,
        onNewMessage,
        onMessageNotification,
        onMessagesRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
