import { lazy } from "react";
import { Button } from "../ui/button"
import { X } from "lucide-react"
import { useSetChatWidgetOpen } from "@/lib/slices/ui/actions"
import Conversations from "./Conversations";
import { useActiveConversationId } from "@/lib/slices/chat/selectors";
const ChatWindow = lazy(() => import("./ChatWindow"));

const YourMessages = () => {
    const setChatWidgetOpen = useSetChatWidgetOpen();
    const activeConversationId = useActiveConversationId();
    return (
        <div className="fixed bottom-10 right-10 z-50 w-full h-auto max-w-md bg-white rounded-lg shadow-2xl p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Your Messages</h1>
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setChatWidgetOpen(false)}>
                    <X className="size-4" />
                </Button>
            </div>
            {activeConversationId ? <ChatWindow conversationId={activeConversationId} /> : <Conversations />}
        </div>
    )
}

export default YourMessages