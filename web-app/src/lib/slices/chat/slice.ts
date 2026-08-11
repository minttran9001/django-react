import { Conversation } from "@/lib/types/conversation";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConversationsState {
  activeId: Conversation["id"] | null;
  draftMessageByConversationId: Record<Conversation["id"], string | null>;
}

const initialState: ConversationsState = {
  activeId: null,
  draftMessageByConversationId: {},
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
  },
});

export const {
  setActiveConversation,
  clearActiveConversation,
  setDraftMessage,
  clearDraftMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
