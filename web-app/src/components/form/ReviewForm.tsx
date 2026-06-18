
import { RequestReviewFormValues, requestReviewSchema } from "@/features/auth/schemas/reviewSchema";
import { Form } from "./Form";
import { FieldTextarea } from "./FieldTextarea";
import { Button } from "../ui/button";
import { FieldRatingInput } from "./FieldRatingInput";
import { cn } from "@/lib/utils";

type ReviewFormProps = {
    onSubmit: (values: RequestReviewFormValues) => void;
    className?: string;
    defaultValues?: RequestReviewFormValues;
}

const ratingOptions = Array.from({ length: 5 }, (_, i) => i + 1);

const ReviewForm = ({ onSubmit, className, defaultValues }: ReviewFormProps) => {
    return (
        <Form schema={requestReviewSchema} onSubmit={onSubmit} className={cn("space-y-3", className)} defaultValues={defaultValues}>
            {(form) => <>
                <FieldRatingInput name="rating" label="Rating" options={ratingOptions} />
                <FieldTextarea name="comment" label="Comment" />
                <Button className="w-full" type="submit" isLoading={form.formState.isSubmitting} disabled={form.formState.isSubmitting}>Submit</Button></>
            }
        </Form>
    )
}

export default ReviewForm;