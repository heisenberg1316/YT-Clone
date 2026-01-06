import { Check } from "lucide-react";
export const SUCCESS_TOAST_CONFIG = {
    icon: <Check className="text-green-500" />,
    duration: 3000,
    cancel: {
        label: "Close",
        onClick: () => {},
    },
} as const;