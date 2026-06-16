import { cn } from "@/lib/utils";
import Link from "next/link";

type VerticalTabNavigationProps = {
    tabs: {
        label: string;
        value: string;
        icon: React.ReactNode;
        href: string;
    }[];
    label: string;
    activeTab: string;
    className?: string;
};

const VerticalTabNavigation = ({ tabs, label, activeTab, className }: VerticalTabNavigationProps) => {
    return (
        <div className={cn("flex flex-col gap-2 bg-white p-4 max-w-xs rounded-lg h-full", className)}>
            <h2 className="text-lg font-medium mb-4">{label}</h2>
            <div className="flex flex-col gap-2">
                {tabs.map((tab) => (
                    <Link key={tab.value} href={tab.href} className={cn("flex p-2 rounded-md items-center gap-2", {
                        'bg-primary text-primary-foreground hover:bg-primary/90': activeTab === tab.value,
                        'hover:bg-gray-100': activeTab !== tab.value,
                    })}>
                        {tab.icon}
                        <span className="text-sm">{tab.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default VerticalTabNavigation;