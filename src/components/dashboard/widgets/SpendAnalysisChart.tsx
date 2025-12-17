"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// Mock data if none provided
const defaultData = [
    { name: "IT Hardware", value: 45000, color: "#6366f1" },
    { name: "Software", value: 32000, color: "#8b5cf6" },
    { name: "Office Supplies", value: 12000, color: "#ec4899" },
    { name: "Furniture", value: 28000, color: "#a855f7" },
    { name: "Services", value: 18000, color: "#3b82f6" },
    { name: "Marketing", value: 24000, color: "#14b8a6" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const value = payload[0].value; // Extract value here
        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                <p className="font-semibold text-popover-foreground mb-1">{label}</p>
                <p className="text-primary font-bold">
                    {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                    }).format(value)}</p>
            </div>
        );
    }
    return null;
};

export function SpendAnalysisChart() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Spend Analysis</CardTitle>
                        <CardDescription>Monthly spend distribution by category</CardDescription>
                    </div>
                    <div className="flex items-center text-emerald-500 font-medium text-sm bg-emerald-500/10 px-2 py-1 rounded-full">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +12.5%
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={defaultData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            onMouseMove={(state: any) => {
                                if (state.isTooltipActive) {
                                    setActiveIndex(state.activeTooltipIndex);
                                } else {
                                    setActiveIndex(null);
                                }
                            }}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={1500}>
                                {defaultData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        opacity={activeIndex === index ? 1 : activeIndex === null ? 0.8 : 0.4}
                                        className="transition-all duration-300 cursor-pointer"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
