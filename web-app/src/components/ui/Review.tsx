import type { Review as ReviewType } from "@/lib/types/review";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewProps = {
    review: ReviewType;
    className?: string;
};

const Review = (props: ReviewProps) => {
    const { review, className } = props;
    const { rating, comment } = review;
    return <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon key={index} className={cn("size-4 text-yellow-500", index < rating ? "fill-yellow-500" : "text-yellow-500")} />
            ))}
        </div>
        <p className="text-sm text-muted-foreground">{comment}</p>
    </div>;
};

export default Review;