export const swrKeys = {
  adminMe: "/api/admin/me",
  userMe: "/api/users/me",
  userStats: "/api/users/me/stats",
  friends: "/api/friends",
  friendsIncoming: "/api/friends/requests?type=incoming&status=pending",
  friendsOutgoing: "/api/friends/requests?type=outgoing&status=pending",
  sessionRequestsIncoming:
    "/api/session-requests?type=incoming&status=pending",
  sessionRequestsOutgoing:
    "/api/session-requests?type=outgoing&status=pending",
  chatUnreadCounts: "/api/chat/unread-counts",
  communityPosts: (limit = 20) => `/api/community/posts?limit=${limit}`,
  communityPostsPage: (cursor: string, limit = 20) =>
    `/api/community/posts?cursor=${cursor}&limit=${limit}`,
  communityWelcome: (limit = 40) =>
    `/api/community/welcome?limit=${limit}`,
  communityWelcomePage: (cursor: string, limit = 30) =>
    `/api/community/welcome?cursor=${cursor}&limit=${limit}`,
  globalChat: (limit = 30) => `/api/global-chat?limit=${limit}`,
  communityMatch: "/api/community/match",
  sessions: (from: string, to: string) =>
    `/api/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
} as const;
