import { SendIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSendMessageMutation } from "@/lib/api/messageApi/messageApi";
import { Conversation } from "@/lib/types/conversation";
import { FieldTextarea, Form } from "../form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useDraftMessage } from "@/lib/slices/chat/selectors";
import { useSetDraftMessage } from "@/lib/slices/chat/actions";
import { useRef } from "react";
import { UseFormReturn } from "react-hook-form";

const sendMessageSchema = z.object({
    body: z.string().min(1, "Message is required"),
});

type SendMessageFormValues = z.infer<typeof sendMessageSchema>;

type ComposerProps = {
    conversationId: Conversation["id"] | undefined;
    className?: string;
}

const Composer = ({ conversationId, className = "" }: ComposerProps) => {
    const [sendMessage] = useSendMessageMutation();
    const draftMessage = useDraftMessage(conversationId ?? 0);
    const setDraftMessage = useSetDraftMessage();
    const formRef = useRef<UseFormReturn<SendMessageFormValues> | null>(null);
    const onSubmit = async (values: SendMessageFormValues) => {
        if (!conversationId) throw new Error("Conversation ID is required");
        setDraftMessage(conversationId, "");
        formRef.current?.reset();
        await sendMessage({ conversationId, body: values.body });
    }
    return (
        <Form className={cn("flex items-center gap-2 w-full", className)} schema={sendMessageSchema} defaultValues={{ body: draftMessage ?? "" }} onSubmit={onSubmit}>
            {(form) => {
                formRef.current = form;
                return <>
                    <FieldTextarea
                        name="body"
                        placeholder="Message"
                        containerClassName="flex-1"
                        onValueChange={(value) => setDraftMessage(conversationId ?? 0, value)}
                    />
                    <Button type="submit">
                        <SendIcon />
                    </Button>
                </>
            }}
        </Form>
    )
}

export default Composer;