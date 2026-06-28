export const chatsStore: Map<string, unknown> = new Map();

// current plan
// 1. move the chats to the redis as they are less update
// 2. move the done question to the redis
// 3. only keep here the quesiton are streaming
