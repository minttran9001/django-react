import { messageApi } from "@/lib/api/messageApi/messageApi";
import { useEffect, useState } from "react";
import { getChatLocalDb } from "@/lib/localDb";
import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
const DEFAULT_PAGE_SIZE = 40;
const db = getChatLocalDb();

const useHydrateMessages = ({
    conversationId,
}: {
    conversationId?: Conversation["id"] | null;
}) => {
    const dispatch = useAppDispatch();
    const [hydrated, setHydrated] = useState<Record<string, boolean>>({});

    const conversationHydrated = hydrated[conversationId ?? ""];

    useEffect(() => {
        if (!conversationId || conversationHydrated) return;
        const hydrate = async () => {
            const messages = await db.getMessagesByConversationIdAndPage(conversationId, undefined, DEFAULT_PAGE_SIZE);
            if (messages.length === 0) return;
            dispatch(
                messageApi.util.upsertQueryData(
                    "getMessages",
                    { conversationId },
                    {
                        pages: [
                            {
                                // get the latest 40 messages
                                results: messages.slice(-DEFAULT_PAGE_SIZE),
                                // Assume more may exist until network confirms
                                hasMore: true,
                                nextBeforeId: messages[0].id,
                            },
                        ],
                        pageParams: [null],
                    },
                ),
            );
            setHydrated((prev) => ({ ...prev, [conversationId]: true }));
        };
        void hydrate();
    }, [dispatch, conversationId, conversationHydrated]);

    return { hydrated: conversationHydrated };
};

export default useHydrateMessages;
