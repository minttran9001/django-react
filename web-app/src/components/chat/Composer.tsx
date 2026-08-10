import { SendIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSendMessageMutation } from "@/lib/api/messageApi/messageApi";
import { Conversation } from "@/lib/types/conversation";
import { FieldTextInput, Form } from "../form";
import { z } from "zod";

const sendMessageSchema = z.object({
    body: z.string().min(1, "Message is required"),
});

type SendMessageFormValues = z.infer<typeof sendMessageSchema>;

const Composer = ({ conversationId }: { conversationId: Conversation["id"] | undefined }) => {
    const [sendMessage, { isLoading }] = useSendMessageMutation();

    const onSubmit = async (values: SendMessageFormValues) => {
        if (!conversationId) throw new Error("Conversation ID is required");
        await sendMessage({ conversationId, body: values.body });
    }

    return (
        <Form className="flex items-center gap-2 w-full" schema={sendMessageSchema} defaultValues={{ body: "" }} onSubmit={onSubmit}>
            <FieldTextInput
                name="body"
                placeholder="Message"
                containerClassName="flex-1"
            />
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
                <SendIcon />
            </Button>
        </Form>
    )
}

export default Composer;