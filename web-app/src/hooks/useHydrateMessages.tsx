import { messageApi } from "@/lib/api/messageApi/messageApi";
import { ingestMessages } from "@/lib/api/messageApi/messageApi";
import { useEffect, useState } from "react";
import { getChatLocalDb } from "@/lib/localDb";
import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
import { useAuth } from "@/lib/hooks/useAuth";

const DEFAULT_PAGE_SIZE = 40;

const useHydrateMessages = ({
    conversationId,
}: {
    conversationId?: Conversation["id"] | null;
}) => {
    const dispatch = useAppDispatch();
    const [hydrated, setHydrated] = useState<Record<string, boolean>>({});
    const { user } = useAuth();
    const conversationHydrated = hydrated[conversationId ?? ""];

    useEffect(() => {
        if (!conversationId || conversationHydrated) return;
        const hydrate = async () => {
            const db = getChatLocalDb(user?.id);
            const messages = await db.getMessagesByConversationIdAndPage(
                conversationId,
                undefined,
                DEFAULT_PAGE_SIZE,
            );
            if (messages.length === 0) return;
            const pageMessages = messages.slice(-DEFAULT_PAGE_SIZE);
            ingestMessages(dispatch, pageMessages);
            dispatch(
                messageApi.util.upsertQueryData(
                    "getMessages",
                    { conversationId },
                    {
                        pages: [
                            {
                                clientIds: pageMessages.map((message) => message.clientId),
                                hasMore: true,
                                nextBeforeId: pageMessages[0]?.id ?? null,
                            },
                        ],
                        pageParams: [null],
                    },
                ),
            );
            setHydrated((prev) => ({ ...prev, [conversationId]: true }));
        };
        void hydrate();
    }, [dispatch, conversationId, conversationHydrated, user?.id]);

    return { hydrated: conversationHydrated };
};

export default useHydrateMessages;
