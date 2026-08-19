import { Conversation } from "@/lib/types/conversation";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConversationsState {
  activeId: Conversation["id"] | null;
  draftMessageByConversationId: Record<Conversation["id"], string | null>;
  typingByConversationId: Record<
    Conversation["id"],
    { [userId: number]: boolean }
  >;
}

const initialState: ConversationsState = {
  activeId: null,
  draftMessageByConversationId: {},
  typingByConversationId: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation: (
      state,
      action: PayloadAction<Conversation["id"] | null>,
    ) => {
      state.activeId = action.payload;
    },
    clearActiveConversation: (state) => {
      state.activeId = null;
    },
    setDraftMessage: (
      state,
      action: PayloadAction<{
        conversationId: Conversation["id"];
        draftMessage: string;
      }>,
    ) => {
      state.draftMessageByConversationId[action.payload.conversationId] =
        action.payload.draftMessage;
    },
    clearDraftMessage: (
      state,
      action: PayloadAction<{ conversationId: Conversation["id"] }>,
    ) => {
      state.draftMessageByConversationId[action.payload.conversationId] = null;
    },

    setTyping: (
      state,
      action: PayloadAction<{
        conversationId: Conversation["id"];
        userId: number;
        typing: boolean;
      }>,
    ) => {
      state.typingByConversationId[action.payload.conversationId] = {
        ...(state.typingByConversationId[action.payload.conversationId] || {}),
        [action.payload.userId]: action.payload.typing,
      };
    },
    clearTyping: (
      state,
      action: PayloadAction<{
        conversationId: Conversation["id"];
        userId: number;
      }>,
    ) => {
      state.typingByConversationId[action.payload.conversationId] = {
        ...(state.typingByConversationId[action.payload.conversationId] || {}),
        [action.payload.userId]: false,
      };
    },
  },
});

export const {
  setActiveConversation,
  clearActiveConversation,
  setDraftMessage,
  clearDraftMessage,
  setTyping,
  clearTyping,
} = chatSlice.actions;

export default chatSlice.reducer;
