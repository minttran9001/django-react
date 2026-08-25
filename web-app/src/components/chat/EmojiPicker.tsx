import Picker, { EmojiClickData } from 'emoji-picker-react';
import { Button } from '../ui/button';
import { SmileIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type EmojiPickerProps = {
    onEmojiClick: (emoji: EmojiClickData) => void;
    className?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}
const EmojiPicker = (props: EmojiPickerProps) => {
    const { onEmojiClick, className, open, onOpenChange } = props;
    const [isOpen, setIsOpen] = useState(false);

    const handleEmojiClick = (emojiObject: EmojiClickData) => {
        onEmojiClick?.(emojiObject);
    };


    const openToUse = typeof open === 'boolean' ? open : isOpen;
    const setOpenToUse = typeof onOpenChange === 'function' ? onOpenChange : setIsOpen;

    useEffect(() => {
        if (!openToUse) return;
        const onClickOutside = (event: MouseEvent) => {
            if (event.target instanceof Element && !event.target.closest('#emoji-picker')) {
                setOpenToUse(false);
            }
        };
        const onClickEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenToUse(false);
            }
        };
        document.body.addEventListener('click', onClickOutside);
        document.body.addEventListener('keydown', onClickEscape);
        return () => {
            document.body.removeEventListener('click', onClickOutside);
            document.body.removeEventListener('keydown', onClickEscape);
        };
    }, [openToUse, setOpenToUse]);


    return (
        <div className={cn("relative", className)}>
            <Button type="button" variant="outline" size="icon" onClick={(e) => {
                e.stopPropagation();
                setOpenToUse(!openToUse);
            }}>
                <SmileIcon />
            </Button>
            <div id="emoji-picker" className={cn("absolute bottom-[calc(100%+8px)] right-0 shadow-lg rounded-md", {
                "hidden": !openToUse,
                "block": openToUse,
            })}>
                <Picker onEmojiClick={handleEmojiClick} />
            </div>
        </div>
    );
};

export default EmojiPicker;