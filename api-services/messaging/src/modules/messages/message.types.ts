export type SendMessageInput = {
  body: string;
  clientId: string;
  conversationId?: number;
  createdAt?: Date;
  memberUserIds?: number[];
  name?: string;
};

export type ListMessagesQuery = {
  limit: number;
  beforeId?: number;
  afterId?: number;
};
