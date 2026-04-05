export class ConversationSessionModel {
  sessionId: string;
  clientId: string;
  createdAt: number;
  updatedAt: number;
}

export class ConversationItemModel {
  itemId: string;
  sessionId: string;
  sequenceNumber: number;
  role: string;
  content: string;
  metadata: string | undefined;
  createdAt: number;
  deletedAt: number | undefined;
}
