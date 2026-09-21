export const memberInclude = {
  user: {
    include: {
      profile: {
        include: { avatar: true },
      },
    },
  },
} as const;

export const conversationInclude = {
  members: { include: memberInclude },
  lastMessageSender: { include: memberInclude },
} as const;
