"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  ImageIcon,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  ArrowLeft,
  MessageSquare,
  User,
  Building,
  Circle,
  Trash2,
} from "lucide-react";
import { useSocket } from "@/app/SocketContext";
import { useAuth } from "@/app/(auth)/AuthContext";
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useGetOrCreateConversationMutation,
  Conversation,
  Message as ApiMessage,
} from "@/state/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

const MessagesPage = () => {
  const { user } = useAuth();
  const {
    isConnected,
    onlineUsers,
    typingStates,
    sendMessage: socketSendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    onNewMessage,
    onMessagesRead,
  } = useSocket();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localMessages, setLocalMessages] = useState<ApiMessage[]>([]);
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: conversations = [], refetch: refetchConversations } = useGetConversationsQuery();
  const { data: messagesData, refetch: refetchMessages } = useGetMessagesQuery(
    { conversationId: selectedConversation?.id || 0 },
    { skip: !selectedConversation }
  );

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = user?.role === "tenant" ? conv.manager : conv.tenant;
    return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get the other user in conversation
  const getOtherUser = (conv: Conversation) => {
    return user?.role === "tenant" ? conv.manager : conv.tenant;
  };

  // Handle new messages from Socket
  useEffect(() => {
    const unsubscribe = onNewMessage((message) => {
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        // Convert socket message to ApiMessage format
        const apiMessage: ApiMessage = {
          ...message,
          readAt: message.readAt || null,
        };
        setLocalMessages((prev) => [...prev, apiMessage]);
        // Mark as read immediately if we're viewing
        markMessagesAsRead(selectedConversation.id, [message.id]);
      }
      refetchConversations();
    });

    return () => unsubscribe();
  }, [selectedConversation, onNewMessage, markMessagesAsRead, refetchConversations]);

  // Handle read receipts
  useEffect(() => {
    const unsubscribe = onMessagesRead(({ conversationId, messageIds }) => {
      if (selectedConversation && conversationId === selectedConversation.id) {
        setLocalMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, status: "Read" } : msg
          )
        );
      }
    });

    return () => unsubscribe();
  }, [selectedConversation, onMessagesRead]);

  // Update local messages when API data changes
  useEffect(() => {
    if (messagesData?.messages) {
      setLocalMessages(messagesData.messages);
    }
  }, [messagesData]);

  // Join/leave conversation room
  useEffect(() => {
    if (selectedConversation) {
      joinConversation(selectedConversation.id);
      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, joinConversation, leaveConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (selectedConversation && user) {
      const otherUser = getOtherUser(selectedConversation);
      startTyping(selectedConversation.id, otherUser.cognitoId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedConversation.id, otherUser.cognitoId);
      }, 2000);
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation || !user) return;

    const otherUser = getOtherUser(selectedConversation);

    // Optimistically add message
    const optimisticMessage: ApiMessage = {
      id: Date.now(),
      conversationId: selectedConversation.id,
      senderCognitoId: user.userId,
      senderRole: user.role,
      content: messageInput.trim(),
      status: "Sent",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    setLocalMessages((prev) => [...prev, optimisticMessage]);
    socketSendMessage(selectedConversation.id, messageInput.trim(), otherUser.cognitoId);
    setMessageInput("");

    // Stop typing
    stopTyping(selectedConversation.id, otherUser.cognitoId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  // Format last message time for conversation list
  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "MMM d");
  };

  // Group messages by date
  const groupMessagesByDate = (messages: ApiMessage[]) => {
    const groups: { [key: string]: ApiMessage[] } = {};
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt);
      let key: string;
      if (isToday(date)) {
        key = "Today";
      } else if (isYesterday(date)) {
        key = "Yesterday";
      } else {
        key = format(date, "MMMM d, yyyy");
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(localMessages);

  // Check if other user is typing
  const isOtherUserTyping = selectedConversation
    ? typingStates[selectedConversation.id]?.isTyping &&
      typingStates[selectedConversation.id]?.userId !== user?.userId
    : false;

  return (
    <div className="h-[calc(100vh-120px)] flex bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Conversations List */}
      <div
        className={`w-full md:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${
          isMobileViewingChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            Messages
            {isConnected && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </h1>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-100 dark:bg-gray-700 border-0"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
              <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-center">No conversations yet</p>
              <p className="text-sm text-center mt-1">
                Start a conversation by contacting a property owner
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map((conv, index) => {
                const otherUser = getOtherUser(conv);
                const isOnline = onlineUsers.has(otherUser.cognitoId);
                const isSelected = selectedConversation?.id === conv.id;
                const lastMessage = conv.messages[0];

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedConversation(conv);
                      setIsMobileViewingChat(true);
                    }}
                    className={`p-4 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {otherUser.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {otherUser.name}
                          </h3>
                          {lastMessage && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatLastMessageTime(lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {conv.property && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {conv.property.name.substring(0, 15)}...
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {lastMessage?.content || "No messages yet"}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="min-w-[24px] h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-2">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col ${
          !isMobileViewingChat ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileViewingChat(false)}
                  className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getOtherUser(selectedConversation).name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.has(getOtherUser(selectedConversation).cognitoId) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {getOtherUser(selectedConversation).name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {onlineUsers.has(getOtherUser(selectedConversation).cognitoId)
                      ? "Online"
                      : "Offline"}
                    {isOtherUserTyping && (
                      <span className="text-blue-500 ml-2">typing...</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Video className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-500">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Property Info Banner */}
            {selectedConversation.property && (
              <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                    {selectedConversation.property.photoUrls?.[0] ? (
                      <img
                        src={selectedConversation.property.photoUrls[0]}
                        alt={selectedConversation.property.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedConversation.property.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Conversation about this property
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {Object.entries(messageGroups).map(([date, messages]) => (
                <div key={date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {messages.map((message, index) => {
                      const isSender = message.senderCognitoId === user?.userId;

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isSender
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md shadow-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 ${
                                isSender ? "text-blue-100" : "text-gray-400"
                              }`}
                            >
                              <span className="text-[10px]">
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {isSender && (
                                <>
                                  {message.status === "Read" ? (
                                    <CheckCheck className="w-3 h-3 text-blue-200" />
                                  ) : message.status === "Delivered" ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isOtherUserTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-gray-500 hidden md:flex">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-500 hidden md:flex">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="pr-10 bg-gray-100 dark:bg-gray-700 border-0 rounded-full"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hidden md:flex"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full w-10 h-10 p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                <MessageSquare className="w-16 h-16 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Your Messages
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Select a conversation from the list to start messaging
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
