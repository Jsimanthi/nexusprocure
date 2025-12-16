"use client";

import {
    CreditCard,
    FileText,
    LayoutDashboard,
    Settings,
    ShoppingCart,
    Truck,
    User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <>
            <div className="hidden md:flex items-center text-sm text-muted-foreground border rounded-md px-2 py-1 bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => setOpen(true)}>
                <span className="mr-2">Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/iom"))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>IOMs</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/po"))}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            <span>Purchase Orders</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/pr"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Payment Requests</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/vendors"))}>
                            <Truck className="mr-2 h-4 w-4" />
                            <span>Vendors</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/billing"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Billing</span>
                            <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
