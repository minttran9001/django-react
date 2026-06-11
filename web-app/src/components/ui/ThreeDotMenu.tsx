import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EllipsisIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ThreeDotMenuProps = {
    items: { id: string; label: string | React.ReactNode; onClick?: () => void; icon?: React.ReactNode; className?: string }[];
    triggerClassName?: string;
}

const ThreeDotMenu = ({ items, triggerClassName }: ThreeDotMenuProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("w-fit px-0 hover:bg-muted py-0.5 h-fit", triggerClassName)}>
                    <EllipsisIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {items.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={item.onClick} className={cn("flex items-center gap-2", item.className)}>
                        {item.icon}
                        {typeof item.label === "string" ? <span>{item.label}</span> : item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default ThreeDotMenu;