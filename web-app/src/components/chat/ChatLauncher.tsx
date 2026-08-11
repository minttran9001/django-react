import { MessageCircleIcon } from "lucide-react"
import { Button } from "../ui/button"
import { useSetChatWidgetOpen } from "@/lib/slices/ui/actions"

const ChatLauncher = () => {
    const setChatWidgetOpen = useSetChatWidgetOpen();

    return (
        <div className="fixed bottom-4 right-4 z-50 cursor-pointer">
            <Button variant="outline" size="icon" className="size-10" onClick={() => setChatWidgetOpen(true)}>
                <MessageCircleIcon />
            </Button>
        </div>
    )
}

export default ChatLauncher