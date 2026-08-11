import { messageApi } from "@/lib/api/messageApi/messageApi";
import { useEffect, useState } from "react";
import { getChatLocalDb } from "@/lib/localDb";
import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";

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
            const messages = await db.getMessagesByConversationId(conversationId);
            const metadata = await db.getConversationMetadata(conversationId);
            const hasMore = metadata?.hasMore ?? true;
            const nextBeforeId = metadata?.nextBeforeId ?? null;
            if (messages.length === 0) return;


            dispatch(
                messageApi.util.upsertQueryData(
                    "getMessages",
                    { conversationId },
                    {
                        pages: [
                            {
                                results: messages.slice(-40),
                                // Assume more may exist until network confirms
                                hasMore: hasMore,
                                nextBeforeId: nextBeforeId,
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
