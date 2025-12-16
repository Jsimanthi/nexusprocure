"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Copy, RefreshCcw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

export function SmartSummary() {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<string>("");

    const generateSummary = async () => {
        setLoading(true);
        setSummary("");

        // Simulate AI streaming response
        const mockResponse = "Based on the recent procurement data, there is a notable 15% increase in IT hardware spending compared to last month. The approval cycle for purchase orders under $5k has improved by 2 days. However, 3 urgent IOMs for 'Office Supplies' are still pending review. Recommended action: Approve the pending office supply requests to prevent operational delays.";

        const words = mockResponse.split(" ");

        for (let i = 0; i < words.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Typing effect
            setSummary(prev => prev + (i === 0 ? "" : " ") + words[i]);
        }

        setLoading(false);
    };

    return (
        <Card className="shadow-md hover:shadow-xl transition-all border-indigo-500/20 bg-gradient-to-br from-background to-indigo-500/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">AI Insight</CardTitle>
                            <CardDescription>Smart procurement assistant</CardDescription>
                        </div>
                    </div>
                    {!summary && (
                        <Button
                            size="sm"
                            onClick={generateSummary}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? <Bot className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            {loading ? "Thinking..." : "Generate Analysis"}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {summary ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-background/50 p-4 rounded-xl border backdrop-blur-sm text-sm leading-relaxed text-foreground/90">
                            {summary}
                            {loading && <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse" />}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-500">
                                    <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500">
                                    <ThumbsDown className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => generateSummary()} className="text-xs h-8">
                                    <RefreshCcw className="h-3 w-3 mr-2" />
                                    Regenerate
                                </Button>
                                <Button variant="ghost" size="sm" className="text-xs h-8">
                                    <Copy className="h-3 w-3 mr-2" />
                                    Copy
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 opacity-60">
                        <Bot className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground max-w-[250px]">
                            Click generate to get an AI-powered summary of your current procurement status.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
