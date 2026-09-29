export type SendMessageInput = {
  body: string;
  clientId: string;
  conversationId?: number;
  createdAt?: Date;
  memberUserIds?: number[];
  name?: string;
};

export type ListMessagesQuery = {
  limit: number | string;
  beforeId?: number | string;
  before_id?: number | string;
  afterId?: number | string;
  after_id?: number | string;
};

export type SendMessageBody = {
  body: string | string;
  clientId: string | string;
  conversationId?: number | string;
  createdAt?: Date | string;
  memberUserIds?: number[] | string[];
  name?: string | string;
};
