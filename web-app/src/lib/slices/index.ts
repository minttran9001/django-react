import uiSlice from "./ui/slice";
import chatSlice from "./chat/slice";
import marketplaceDataSlice from "./marketplaceData/slice";

const reducers = {
  ui: uiSlice,
  chat: chatSlice,
  marketplaceData: marketplaceDataSlice,
};

export default reducers;
