export function chatChannel(userA: string, userB: string) {
  const [a, b] = [userA, userB].sort();
  return `chat:${a}:${b}`;
}

export function userChannel(userId: string) {
  return `user:${userId}:chat`;
}

export function globalChatChannel() {
  return "chat:global";
}

export function sessionsChannel() {
  return "sessions:updates";
}
