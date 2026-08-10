import { Conversation } from "@/lib/types/conversation";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConversationsState {
  activeId: Conversation["id"] | null;
}

const initialState: ConversationsState = {
  activeId: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation: (
      state,
      action: PayloadAction<Conversation["id"]>,
    ) => {
      state.activeId = action.payload;
    },
    clearActiveConversation: (state) => {
      state.activeId = null;
    },
  },
});

export const { setActiveConversation, clearActiveConversation } =
  chatSlice.actions;

export default chatSlice.reducer;
