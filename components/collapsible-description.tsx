"use client";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect } from "framer-motion";
import { useRef, useState } from "react";

export function CollapsibleDescription({
    text,
}: {
    text: string;
}) {

    const ref = useRef<HTMLParagraphElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [open, setOpen] = useState(false);

    useIsomorphicLayoutEffect(() => {
        const handleOverflow = () => {
            const el = ref.current;
            if (el) {
                setIsOverflowing(el.scrollHeight > el.clientHeight)
            }
        }

        handleOverflow()

        window.addEventListener("resize", handleOverflow)
        return () => window.removeEventListener("resize", handleOverflow)

    }, [text])

    const handleClick = () => setOpen(!open);

    const className = "overflow-hidden text-left text-sm text-white/90 drop-shadow-sm max-h-[2lh] transition-[max-height] ease-in-out"

    if (isOverflowing) {
        return (
            <button onClick={handleClick} className="text-left text-sm">
                <p ref={ref} className={cn(className, open && "max-h-[12lh]")}>{text}
                </p>
                <div className={cn("transition-[height]  overflow-hidden text-muted-foreground", !open ? "h-[1lh]" : "h-[0px]")}>Read more...</div>
            </button>
        )
    }

    return (
        <p ref={ref} className={className}>{text}</p>
    )

}
