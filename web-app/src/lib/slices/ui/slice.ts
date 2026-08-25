import { ConversationMember } from "@/lib/types/conversation";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type UserId = ConversationMember["user"]["id"];

type UiState = {
  chatWidgetOpen: boolean;
  newMessageOpen: Record<UserId, boolean>;
};

const initialState: UiState = {
  chatWidgetOpen: true,
  newMessageOpen: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setChatWidgetOpen: (state, action: PayloadAction<boolean>) => {
      state.chatWidgetOpen = action.payload;
    },
    setNewMessageOpen: (
      state,
      action: PayloadAction<{
        userId: UserId;
        open: boolean;
      }>,
    ) => {
      if (action.payload.open) {
        state.newMessageOpen[action.payload.userId] = true;
      } else {
        delete state.newMessageOpen[action.payload.userId];
      }
    },
    clearNewMessageOpen: (state) => {
      state.newMessageOpen = {};
    },
  },
});

export const { setChatWidgetOpen, setNewMessageOpen, clearNewMessageOpen } =
  uiSlice.actions;
export default uiSlice.reducer;
