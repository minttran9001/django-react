"use client";

import { useAppSelector } from "@/lib/hooks";
import { marketplaceMessageSelectors } from "@/lib/slices/marketplaceData/slice";
import { DRAFT_CONVERSATION_ID } from "@/lib/entities/messages";
import Composer from "./Composer";
import MessageList from "./MessageList";

const NewMessageForm = () => {
  const messages = useAppSelector((state) =>
    marketplaceMessageSelectors
      .selectAll(state)
      .filter((message) => message.conversationId === DRAFT_CONVERSATION_ID),
  );

  return (
    <div className="flex flex-col justify-between items-center mb-4 pt-4 px-4">
      <MessageList
        messages={messages}
        isLoading={false}
        isFetchingOlder={false}
        hasOlder={false}
        onLoadOlder={() => {}}
      />
      <Composer conversationId={DRAFT_CONVERSATION_ID} className="w-full" />
    </div>
  );
};

export default NewMessageForm;
