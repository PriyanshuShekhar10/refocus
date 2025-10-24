"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Trash2, Smile, MoreHorizontal, Users, Clock } from "lucide-react";
import { useSession } from "next-auth/react";

type GlobalMessage = {
  id: string;
  user_id: string;
  user_name?: string | null;
  content: string;
  created_at: string;
  deleted?: boolean;
  deleted_at?: string;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of user_ids
};

export default function GlobalChat() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const load = useMemo(
    () =>
      async function load() {
        try {
          const res = await fetch("/api/global-chat", { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load messages");
          setMessages(data.messages as GlobalMessage[]);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setIsLoading(false);
        }
      },
    []
  );

  useEffect(() => {
    load();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/global-chat/events");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");
          if (data?.type === "hello" || data?.type === "ping") return;
          load();
        } catch {}
      };
    } catch {}
    return () => {
      if (es) es.close();
    };
  }, [load]);

  useEffect(() => {
    // Smooth scroll to bottom when new messages arrive
    const scrollToBottom = () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(scrollToBottom);
  }, [messages.length]);

  // Auto-scroll to bottom when user is near the bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Show/hide scroll to bottom button
    setShowScrollButton(scrollTop > 200);
    
    if (isNearBottom) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const send = async () => {
    const content = text.trim();
    if (!content || isSending) return;
    
    setText("");
    setIsSending(true);
    setError(null);
    
    try {
      const res = await fetch("/api/global-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      await load();
      inputRef.current?.focus();
    } catch (e) {
      setError((e as Error).message);
      setText(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing indicator
    if (e.target.value.trim() && currentUserId) {
      // In a real app, you'd emit typing events here
      // For now, we'll simulate it
    }
    
    // Clear typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentUserId || '');
        return newSet;
      });
    }, 3000);
  };

  const deleteMessage = async (messageId: string) => {
    if (deletingIds.has(messageId)) return;
    
    setDeletingIds(prev => new Set(prev).add(messageId));
    setDeleteConfirmId(null);
    
    try {
      const res = await fetch(`/api/global-chat/${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const commonEmojis = ['😀', '😂', '❤️', '👍', '👎', '🎉', '🔥', '💯', '🤔', '😮'];

  const addReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    
    try {
      const res = await fetch(`/api/global-chat/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      
      if (res.ok) {
        await load();
      }
    } catch (e) {
      console.error('Failed to add reaction:', e);
    }
  };

  const getReactionCount = (message: GlobalMessage, emoji: string) => {
    return message.reactions?.[emoji]?.length || 0;
  };

  const hasUserReacted = (message: GlobalMessage, emoji: string) => {
    return message.reactions?.[emoji]?.includes(currentUserId || '') || false;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-gray-50 dark:bg-gray-900 sm:h-[calc(100vh-3rem)] max-w-4xl mx-auto rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Enhanced Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800 shadow-sm rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white font-semibold text-sm sm:text-lg">#</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                Global Chat
              </h1>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{onlineUsers} online</span>
                  <span className="sm:hidden">{onlineUsers}</span>
                </span>
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
                  <span className="sm:hidden">{messages.length}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
              title="Emoji picker"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105">
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="mx-3 sm:mx-6 mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex flex-wrap gap-2">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => addEmoji(emoji)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 text-lg shadow-sm hover:shadow-md"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Message?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMessage(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 scroll-smooth"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Loading messages...
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Welcome to Global Chat!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                This is a space for everyone to connect, share ideas, and have meaningful conversations. 
                Be respectful and kind to others.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                  💡 Share ideas
                </span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                  🤝 Connect
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  🎉 Have fun
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages
              .filter((m) => {
                const messageDate = new Date(m.created_at);
                const now = new Date();
                const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
                return diffInHours < 24;
              })
              .map((m, idx, filteredMessages) => {
              const showDate = idx === 0 || 
                new Date(filteredMessages[idx - 1].created_at).toDateString() !== 
                new Date(m.created_at).toDateString();
              
              const isOwnMessage = m.user_id === currentUserId;
              const isDeleting = deletingIds.has(m.id);
              
              return (
                <React.Fragment key={m.id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        {new Date(m.created_at).toLocaleDateString([], { 
                          month: 'long', 
                          day: 'numeric',
                          year: new Date(m.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                    </div>
                  )}
                  <div className={`group rounded-2xl px-3 sm:px-4 py-3 sm:py-4 transition-all duration-200 relative ${
                    isOwnMessage 
                      ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-l-4 border-green-500 shadow-sm' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-sm'
                  }`}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isOwnMessage 
                          ? 'bg-gradient-to-br from-green-500 to-green-600' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          {(m.user_name || m.user_id).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {m.user_name || m.user_id}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTime(m.created_at)}
                          </span>
                          {isOwnMessage && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                You
                              </span>
                              <span className="text-xs text-green-500">✓</span>
                            </div>
                          )}
                        </div>
                        {m.deleted ? (
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 shadow-sm">
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                              This message was deleted
                            </p>
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                            isOwnMessage 
                              ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' 
                              : 'bg-gray-50 dark:bg-gray-700'
                          }`}>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                              {m.content}
                            </p>
                            
                            {/* Message Reactions */}
                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {Object.entries(m.reactions).map(([emoji, userIds]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => addReaction(m.id, emoji)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:scale-105 ${
                                      hasUserReacted(m, emoji)
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 hover:shadow-sm'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{userIds.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {!m.deleted && (
                      <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="flex items-center gap-2 mr-3">
                          {/* Quick Reaction Buttons */}
                          <div className="flex items-center gap-1 pointer-events-auto">
                            {['👍', '❤️', '😂', '🎉'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(m.id, emoji)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 shadow-sm ${
                                  hasUserReacted(m, emoji)
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-md'
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:shadow-md'
                                }`}
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          
                          {/* Delete Button (only for own messages) */}
                          {isOwnMessage && (
                            <button
                              onClick={() => setDeleteConfirmId(m.id)}
                              disabled={isDeleting}
                              className="pointer-events-auto bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
        
        {/* Typing Indicators */}
        {isTyping.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span>
              {Array.from(isTyping).length === 1 
                ? 'Someone is typing...' 
                : `${Array.from(isTyping).length} people are typing...`
              }
            </span>
          </div>
        )}
        
        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-20 right-6 z-10 bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl shadow-xl transition-all duration-200 hover:scale-110 hover:shadow-2xl"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Enhanced Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800 shadow-lg rounded-b-xl">
        <div className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isSending}
              className="w-full rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 sm:px-5 py-3 sm:py-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:shadow-md"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
              title="Add emoji"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <button
            onClick={send}
            disabled={!text.trim() || isSending}
            className="rounded-2xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-5 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:bg-gray-300 dark:disabled:hover:bg-gray-700"
          >
            {isSending ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="text-sm font-medium hidden sm:inline">
              {isSending ? 'Sending...' : 'Send'}
            </span>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            <span className="sm:hidden">Enter to send</span>
            {text.length > 0 && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {text.length} characters
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">💬</span>
            <span className="text-xs">Global Chat</span>
          </div>
        </div>
      </div>
    </div>
  );
}