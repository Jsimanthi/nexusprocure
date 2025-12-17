"use client";

import { useHasPermission } from "@/hooks/useHasPermission";
import { cn } from "@/lib/utils";
import { Permission } from "@/types/auth";
import {
    BarChart3,
    ChevronLeft,
    CreditCard,
    FileText,
    LayoutDashboard,
    Menu,
    Settings,
    Shield,
    ShoppingCart,
    Truck,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const canManageUsers = useHasPermission(Permission.MANAGE_USERS);
    const canManageRoles = useHasPermission(Permission.MANAGE_ROLES);
    const canManageSettings = useHasPermission(Permission.MANAGE_SETTINGS);
    const canViewAnalytics = useHasPermission(Permission.VIEW_ANALYTICS);

    const navLinks = [
        {
            href: "/dashboard",
            text: "Dashboard",
            icon: LayoutDashboard,
            show: true,
        },
        {
            href: "/dashboard/analytics",
            text: "Analytics",
            icon: BarChart3,
            show: canViewAnalytics,
        },
        { href: "/iom", text: "IOMs", icon: FileText, show: true },
        { href: "/po", text: "POs", icon: ShoppingCart, show: true },
        { href: "/pr", text: "PRs", icon: CreditCard, show: true },
        { href: "/vendors", text: "Vendors", icon: Truck, show: true },
        {
            href: "/dashboard/users",
            text: "Users",
            icon: Users,
            show: canManageUsers,
        },
        {
            href: "/dashboard/roles",
            text: "Roles",
            icon: Shield,
            show: canManageRoles,
        },
        {
            href: "/dashboard/settings",
            text: "Settings",
            icon: Settings,
            show: canManageSettings,
        },
    ];

    const visibleNavLinks = navLinks.filter((link) => link.show);

    return (
        <div
            className={cn(
                "relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[80px]" : "w-[280px]",
                className
            )}
        >
            <div className="flex h-16 items-center border-b px-6">
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex items-center gap-2 font-bold transition-all",
                        isCollapsed ? "justify-center" : ""
                    )}
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <span className="text-lg">N</span>
                    </div>
                    {!isCollapsed && (
                        <span className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                            NexusProcure
                        </span>
                    )}
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid gap-1 px-2">
                    {visibleNavLinks.map((link, index) => {
                        const Icon = link.icon;
                        const isActive =
                            pathname === link.href ||
                            (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group relative",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                        : "text-muted-foreground",
                                    isCollapsed && "justify-center"
                                )}
                            >
                                <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                                {!isCollapsed && <span>{link.text}</span>}

                                {isActive && (
                                    <div className="absolute left-0 h-full w-1 bg-primary rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t p-4">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    {isCollapsed ? <Menu className="h-5 w-5" /> : (
                        <div className="flex items-center gap-2">
                            <ChevronLeft className="h-5 w-5" />
                            <span className="text-sm font-medium">Collapse Sidebar</span>
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}
