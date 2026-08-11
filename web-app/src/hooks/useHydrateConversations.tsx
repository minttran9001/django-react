import { useEffect, useState } from "react";
import { getChatLocalDb } from "@/lib/localDb";
import { conversationApi } from "@/lib/api/conversationApi/conversationApi";
import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
const db = getChatLocalDb();
const useHydrateConversations = () => {
    const dispatch = useAppDispatch();
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        if (hydrated) return;
        const hydrate = async () => {
            const conversations = await db.getConversations();
            if (conversations.length === 0) return;
            const conversationsById = conversations.reduce((acc, conversation) => {
                acc[conversation.id] = conversation;
                return acc;
            }, {} as Record<string, Conversation>);
            dispatch(conversationApi.util.upsertQueryData("getConversations", undefined, conversationsById));
            setHydrated(true);
        };
        void hydrate();
    }, [dispatch, hydrated]);

    return { hydrated };
};

export default useHydrateConversations;