import { SendIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSendMessageMutation } from "@/lib/api/messageApi/messageApi";
import { Conversation } from "@/lib/types/conversation";
import { FieldTextInput, Form } from "../form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useDraftMessage } from "@/lib/slices/chat/selectors";
import { useSetDraftMessage } from "@/lib/slices/chat/actions";
import { useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { useChatContext } from "@/providers/ChatContext";
import { throttle } from "lodash";

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
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const { sendTyping } = useChatContext();
    const onSubmit = async (values: SendMessageFormValues) => {
        if (!conversationId) throw new Error("Conversation ID is required");
        setDraftMessage(conversationId, "");
        formRef.current?.setValue("body", "");
        await sendMessage({ conversationId, body: values.body });
    }


    const debouncedHandler = useCallback(
        // eslint-disable-next-line react-hooks/use-memo
        throttle((typing: boolean) => {
            if (!conversationId) throw new Error("Conversation ID is required");
            sendTyping(conversationId, typing);
        }, 500),
        [sendTyping, conversationId]
    );

    return (
        <Form className={cn("flex items-center gap-2 w-full", className)} schema={sendMessageSchema} defaultValues={{ body: draftMessage ?? "" }} onSubmit={onSubmit}>
            {(form) => {
                formRef.current = form;
                return <>
                    <FieldTextInput
                        name="body"
                        placeholder="Message"
                        containerClassName="flex-1"
                        autoComplete="off"
                        onValueChange={(value) => {
                            setDraftMessage(conversationId ?? 0, value);
                            if (value.length > 0) {
                                if (timeoutIdRef.current) {
                                    clearTimeout(timeoutIdRef.current);
                                }
                                debouncedHandler(true);
                            }

                            timeoutIdRef.current = setTimeout(() => {
                                debouncedHandler(false);
                            }, 3000);
                        }}
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