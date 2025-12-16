"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Notifications from "./Notifications";

import { CommandPalette } from "./CommandPalette";

export function TopBar() {
    const { data: session } = useSession();

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex-1">
                <CommandPalette />
            </div>
            <div className="flex items-center gap-4">
                <Notifications />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-input bg-background p-0 hover:bg-accent hover:text-accent-foreground">
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                                <User className="h-5 w-5" />
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                                <p className="text-xs font-semibold text-primary mt-1 capitalize">
                                    {session?.user?.role?.name}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile" className="cursor-pointer">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings" className="cursor-pointer">Settings</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-500 hover:text-red-600 cursor-pointer"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
