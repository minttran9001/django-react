import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    chatWidgetOpen: true,
  },
  reducers: {
    setChatWidgetOpen: (state, action: PayloadAction<boolean>) => {
      state.chatWidgetOpen = action.payload;
    },
  },
});

export const { setChatWidgetOpen } = uiSlice.actions;
export default uiSlice.reducer;
