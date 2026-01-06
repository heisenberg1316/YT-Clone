import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type React from "react"

type BaseButtonProps = React.ComponentProps<typeof Button>

interface SubscriptionButtonProps {
  onClick?: BaseButtonProps["onClick"]
  disabled: boolean
  isSubscribed: boolean
  className?: string
  size?: BaseButtonProps["size"]
}


const SubscriptionButton = ({
    onClick,
    disabled,
    isSubscribed,
    className,
    size,
    }: SubscriptionButtonProps) => {
    return (
        <Button
            size={size}
            variant={isSubscribed ? "secondary" : "default"}
            onClick={onClick}
            disabled={disabled}
            className={cn("rounded-full", className, `${isSubscribed ? "hover:bg-gray-300" : "hover:bg-gray-600"}`)}
        >
            {isSubscribed ? "Unsubscribe" : "Subscribe"}
        </Button>
    )
}

export default SubscriptionButton
