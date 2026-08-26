import {
    useClearNewMessageOpen,
    useSetChatWidgetOpen,
} from "@/lib/slices/ui/actions";
import { useNewMessageOpen } from "@/lib/slices/ui/selectors";
import { useMarketplaceUser } from "@/lib/slices/marketplaceData/actions";
import { useGetPublicUserQuery } from "@/lib/api/usersApi";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import NewMessageForm from "./NewMessageForm";
import { useGetDirectConversationQuery } from "@/lib/api/conversationApi/conversationApi";
import { useEffect } from "react";
import { useSetActiveConversation } from "@/lib/slices/chat/actions";

const NewMessage = () => {
    const setChatWidgetOpen = useSetChatWidgetOpen();
    const clearNewMessageOpen = useClearNewMessageOpen();
    const newMessageOpen = useNewMessageOpen();
    const userId = Number(Object.keys(newMessageOpen)[0]);
    const marketplaceUser = useMarketplaceUser(userId);
    const setActiveConversation = useSetActiveConversation();
    useGetPublicUserQuery(userId, {
        skip: !userId || Boolean(marketplaceUser),
    });
    const name = marketplaceUser?.name;

    const {
        data: directConversation,
        isLoading: isLoadingDirectConversation,
        isFetching: isFetchingDirectConversation,
    } = useGetDirectConversationQuery({ userId }, { skip: !userId, refetchOnMountOrArgChange: true });
    useEffect(() => {
        if (directConversation) {
            setActiveConversation(directConversation);
            clearNewMessageOpen();
        }
    }, [directConversation, setActiveConversation, clearNewMessageOpen]);

    return (
        <div className="fixed bottom-10 right-10 z-50 w-full h-auto max-w-md bg-white rounded-lg shadow-2xl">
            {isLoadingDirectConversation || isFetchingDirectConversation ? (
                <div className="flex justify-center items-center h-full min-h-100">
                    <Loader2 className="size-4 animate-spin" />
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-4 pt-4 px-4 shadow-sm pb-3">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="size-6"
                                onClick={() => clearNewMessageOpen()}
                            >
                                <ArrowLeft className="size-4" />
                            </Button>
                            <h1 className="text-2xl font-bold">
                                {name ? `New Message with ${name}` : "New Message"}
                            </h1>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => {
                                setChatWidgetOpen(false);
                                clearNewMessageOpen();
                            }}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                    <NewMessageForm />
                </>
            )}
        </div>
    );
};

export default NewMessage;
