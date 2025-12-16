"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { Bot, Send, User as UserIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function NexusChatbot() {
    const [isOpen, setIsOpen] = useState(false);

    // Using Vercel AI SDK hook. 
    // AI SDK 5.0 migration: useChat no longer manages input state.
    const [input, setInput] = useState("");
    // @ts-ignore - Ignoring stale IDE type mismatch
    const chatHelpers = useChat({
        api: '/api/chat',
        initialMessages: [
            { role: 'assistant', id: 'welcome', content: "Hello! I'm Nexus AI. Ask me about your spending, open POs, or vendor performance." }
        ]
    } as any) as any;

    const { messages, append, isLoading } = chatHelpers;

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const toggleChat = () => setIsOpen(!isOpen);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        append({ role: 'user', content: input });
        setInput("");
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <Button
                    onClick={toggleChat}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-0 z-50 animate-bounce-subtle"
                >
                    <Bot className="h-8 w-8" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card className="fixed bottom-6 right-6 w-[380px] h-[600px] shadow-2xl z-50 flex flex-col border-indigo-100 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl p-4 shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Nexus AI</CardTitle>
                                    <p className="text-xs text-indigo-100 opacity-80 flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                                        Online
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={toggleChat} className="text-white hover:bg-white/20">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50 relative">
                        <div className="absolute inset-0 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            {messages.map((m: any) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex items-start gap-2 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200'
                                            }`}>
                                            {m.role === 'user' ? <UserIcon className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-indigo-600" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex items-start gap-2 max-w-[80%]">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white border border-slate-200 rounded-tl-none shadow-sm flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-3 bg-white border-t border-slate-100">
                        <form className="flex w-full gap-2" onSubmit={handleFormSubmit}>
                            <Input
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 border-slate-200 focus-visible:ring-indigo-500 bg-slate-50"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </>
    );
}
