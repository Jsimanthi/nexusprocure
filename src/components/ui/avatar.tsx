"use client"

import { cn } from "@/lib/utils"
import * as React from "react"

const AvatarContext = React.createContext<{
    onImageLoadingStatusChange: (status: ImageLoadingStatus) => void
}>({
    onImageLoadingStatusChange: () => { },
})

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error"

const Avatar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    const [status, setStatus] = React.useState<ImageLoadingStatus>("idle")

    return (
        <AvatarContext.Provider
            value={{ onImageLoadingStatusChange: setStatus }}
        >
            <div
                ref={ref}
                className={cn(
                    "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
                    className
                )}
                {...props}
            >
                {/* We define `data-state` to help with styling/debugging if needed */}
                {props.children}
            </div>
        </AvatarContext.Provider>
    )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
    HTMLImageElement,
    React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, ...props }, ref) => {
    const { onImageLoadingStatusChange } = React.useContext(AvatarContext)
    const [loadingStatus, setLoadingStatus] = React.useState<ImageLoadingStatus>(
        "idle"
    )

    React.useLayoutEffect(() => {
        if (!src) {
            setLoadingStatus("error")
            onImageLoadingStatusChange("error")
            return
        }

        // Reset to loading when src changes
        setLoadingStatus("loading")
        onImageLoadingStatusChange("loading")

        const img = new Image()
        img.src = src as string

        img.onload = () => {
            setLoadingStatus("loaded")
            onImageLoadingStatusChange("loaded")
        }

        img.onerror = () => {
            setLoadingStatus("error")
            onImageLoadingStatusChange("error")
        }
    }, [src, onImageLoadingStatusChange])

    if (loadingStatus === "error") {
        return null
    }

    return (
        <img
            ref={ref}
            src={src}
            className={cn("aspect-square h-full w-full", className)}
            {...props}
        />
    )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-muted",
            className
        )}
        {...props}
    />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarFallback, AvatarImage }

