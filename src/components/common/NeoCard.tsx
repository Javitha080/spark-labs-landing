import { cn } from "@/lib/utils";
import React from "react";

interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "primary" | "secondary" | "accent";
    hoverEffect?: boolean;
}

const NeoCard = ({
    children,
    className,
    variant = "default",
    hoverEffect = true,
    ...props
}: NeoCardProps) => {
    const variants = {
        default: "bg-background/80",
        primary: "bg-primary/10 border-primary/20",
        secondary: "bg-secondary/50 border-secondary/20",
        accent: "bg-accent/10 border-accent/20",
    };

    return (
        <div
            className={cn(
                "rounded-xl border p-6 transition-all duration-300",
                "backdrop-blur-md shadow-sm",
                variants[variant],
                hoverEffect && "hover:-translate-y-1 hover:shadow-glass hover:border-primary/30",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default NeoCard;
