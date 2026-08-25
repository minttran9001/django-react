import { useEffect, useState } from "react";
import { getChatLocalDb } from "@/lib/localDb";
import { conversationApi } from "@/lib/api/conversationApi/conversationApi";
import { useAppDispatch } from "@/lib/hooks";
import { usersFromConversations } from "@/lib/entities/conversations";
import { ingestTyped } from "@/lib/marketplace/ingest";
import { useAuth } from "@/lib/hooks/useAuth";


const useHydrateConversations = () => {
  const dispatch = useAppDispatch();
  const [hydrated, setHydrated] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    if (hydrated || !user?.id) return;
    const db = getChatLocalDb(user?.id);
    const hydrate = async () => {
      const conversations = await db.getConversations();
      if (conversations.length === 0) return;
      ingestTyped(dispatch, "conversation", conversations);
      ingestTyped(dispatch, "user", usersFromConversations(conversations));
      dispatch(
        conversationApi.util.upsertQueryData("getConversations", undefined, {
          ids: conversations.map((conversation) => conversation.id),
        }),
      );
      setHydrated(true);
    };
    void hydrate();
  }, [dispatch, hydrated, user?.id]);

  return { hydrated };
};

export default useHydrateConversations;
