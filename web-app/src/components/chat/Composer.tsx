import { SendIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSendMessageMutation } from "@/lib/api/messageApi/messageApi";
import { Conversation } from "@/lib/types/conversation";
import { Form } from "../form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useDraftMessage } from "@/lib/slices/chat/selectors";
import { useSetActiveConversation, useSetDraftMessage } from "@/lib/slices/chat/actions";
import { useCallback, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useChatContext } from "@/providers/ChatContext";
import { throttle } from "lodash";
import { RichMessageText } from "../core/RichTextMessage";
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import { EmojiClickData } from "emoji-picker-react";
import { textareaBaseClassName } from "../ui/textarea";
import { replaceEmojiAtCaret } from "@/utils/emoji";
import { serializeSticker, type Sticker } from "@/utils/sticker";
import { useNewMessageOpen } from "@/lib/slices/ui/selectors";
import { useClearNewMessageOpen } from "@/lib/slices/ui/actions";
import { setChatWidgetOpen } from "@/lib/slices/ui/slice";

const sendMessageSchema = z.object({
    body: z.string().min(1),
});

type SendMessageFormValues = z.infer<typeof sendMessageSchema>;

type ComposerProps = {
    conversationId?: Conversation["id"];
    className?: string;
}

type ComposerComponentProps = {
    conversationId: Conversation["id"] | undefined;
    setDraftMessage: (conversationId: number, draftMessage: string) => void;
    form: UseFormReturn<SendMessageFormValues>;
    onSubmit: (values: SendMessageFormValues) => void;
    onStickerSelect: (sticker: Sticker) => void;
}

const ComposerComponent = ({ conversationId, setDraftMessage, form, onSubmit, onStickerSelect }: ComposerComponentProps) => {
    const backDropRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const { sendTyping } = useChatContext();
    const selectionRef = useRef<{ start: number; end: number } | null>(null);
    const pendingCaretRef = useRef<number | null>(null);
    const [openPicker, setOpenPicker] = useState<"emoji" | "sticker" | null>(null);

    const debouncedHandler = useCallback(
        // eslint-disable-next-line react-hooks/use-memo
        throttle((typing: boolean) => {
            if (!conversationId) throw new Error("Conversation ID is required");
            sendTyping(conversationId, typing);
        }, 500),
        [sendTyping, conversationId])

    const handleEmojiClick = (emoji: EmojiClickData) => {
        if (!textareaRef.current) return;
        const emojiString = emoji.emoji;
        const value = textareaRef.current.value;
        const start = selectionRef.current?.start ?? value.length;
        const end = selectionRef.current?.end ?? start;
        const newBody = value.slice(0, start) + emojiString + value.slice(end);
        const newCursorPosition = start + emojiString.length;

        form.setValue("body", newBody);
        onValueChange(newBody);
        requestAnimationFrame(() => {
            pendingCaretRef.current = newCursorPosition;
            selectionRef.current = { start: newCursorPosition, end: newCursorPosition };
        });
    }

    const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart;
        const { value, caret: newCaret, replaced } = replaceEmojiAtCaret(raw, caret);
        if (replaced) {
            e.target.selectionStart = newCaret;
            e.target.selectionEnd = newCaret;
        }
        form.setValue("body", value);
        onValueChange(value);
    }

    const onValueChange = (value: string) => {
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
    }

    const rememberSelection = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        selectionRef.current = {
            start: el.selectionStart,
            end: el.selectionEnd,
        };
    }, []);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.handleSubmit(onSubmit)(e);
        }
    }, [form, onSubmit]);


    return (
        <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 max-w-full min-w-0">
                <div ref={backDropRef} className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent px-3 py-2 text-base md:text-sm">
                    <RichMessageText text={form.watch("body") ?? ""} variant="composer" />
                    {"\n"}
                </div>
                <textarea
                    ref={textareaRef}
                    name="body"
                    placeholder="Message"
                    className={cn(textareaBaseClassName, "text-transparent caret-foreground min-h-9")}
                    rows={1}
                    autoComplete="off"
                    value={form.watch("body") ?? ""}
                    onChange={onChange}
                    onSelect={rememberSelection}
                    onKeyUp={rememberSelection}
                    onClick={rememberSelection}
                    onKeyDown={onKeyDown}
                />
            </div>
            <EmojiPicker
                onEmojiClick={handleEmojiClick}
                open={openPicker === "emoji"}
                onOpenChange={(nextOpen) => setOpenPicker(nextOpen ? "emoji" : null)}
            />
            <StickerPicker
                onStickerClick={(sticker) => {
                    onStickerSelect(sticker);
                    setOpenPicker(null);
                }}
                open={openPicker === "sticker"}
                onOpenChange={(nextOpen) => setOpenPicker(nextOpen ? "sticker" : null)}
            />
            <Button type="submit" className="flex-[0.2] max-w-full shrink-0 grow-0">
                <SendIcon />
            </Button>
        </div>
    )
}

const Composer = ({ conversationId, className = "" }: ComposerProps) => {
    const [sendMessage] = useSendMessageMutation();
    const setDraftMessage = useSetDraftMessage();
    const draftMessage = useDraftMessage(conversationId ?? 0);
    const formRef = useRef<UseFormReturn<SendMessageFormValues> | null>(null);
    const newMessageOpen = useNewMessageOpen();
    const newMessageOpenUserId = Object.keys(newMessageOpen)[0];
    const clearNewMessageOpen = useClearNewMessageOpen();
    const setActiveConversation = useSetActiveConversation();

    const onSubmit = async (values: SendMessageFormValues) => {
        if (!conversationId) throw new Error("Conversation ID is required");
        if (!values.body) return;
        setDraftMessage(conversationId, "");
        formRef.current?.setValue("body", "");
        const response = await sendMessage({ conversationId, body: values.body, memberUserIds: newMessageOpenUserId ? [Number(newMessageOpenUserId)] : undefined });
        if (response.data?.conversationCreated && newMessageOpenUserId) {
            clearNewMessageOpen();
            setChatWidgetOpen(true);
            setActiveConversation(response.data?.conversation.id);
        }
    }

    const onStickerSelect = (sticker: Sticker) => {
        if (!conversationId) throw new Error("Conversation ID is required");
        void sendMessage({ conversationId, body: serializeSticker(sticker) });
    }

    return (
        <Form className={cn(className)} schema={sendMessageSchema} defaultValues={{ body: draftMessage ?? "" }} onSubmit={onSubmit}>
            {(form) => {
                formRef.current = form;
                return (
                    <ComposerComponent conversationId={conversationId} form={form} setDraftMessage={setDraftMessage} onSubmit={onSubmit} onStickerSelect={onStickerSelect} />
                )
            }}
        </Form>
    )
}

export default Composer;