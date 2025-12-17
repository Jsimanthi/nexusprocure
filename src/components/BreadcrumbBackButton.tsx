import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BreadcrumbBackButtonProps {
    href: string;
    text: string;
    className?: string;
}

export function BreadcrumbBackButton({ href, text, className }: BreadcrumbBackButtonProps) {
    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 rounded-full bg-white/50 border border-slate-200/60 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-indigo-600 hover:shadow-md hover:-translate-x-1 hover:border-indigo-200",
                className
            )}
        >
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>{text}</span>
        </Link>
    );
}
