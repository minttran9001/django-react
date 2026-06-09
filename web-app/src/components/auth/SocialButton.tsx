import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SocialButtonProps = {
  className?: string;
} & React.ComponentProps<typeof Button>;

export function SocialButton({ className, ...props }: SocialButtonProps) {
  return (
    <Button
      {...props}
      className={cn("flex w-full items-center gap-2", className)}
    >
      <FcGoogle />
      Continue with Google
    </Button>
  );
}
