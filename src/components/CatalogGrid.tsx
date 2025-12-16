"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CATALOG_ITEMS } from "@/lib/catalog-data";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface CatalogGridProps {
    onSelect: (item: typeof CATALOG_ITEMS[0]) => void;
}

export function CatalogGrid({ onSelect }: CatalogGridProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelect = (item: typeof CATALOG_ITEMS[0]) => {
        onSelect(item);
        const newSelected = new Set(selectedIds);
        newSelected.add(item.id);
        setSelectedIds(newSelected);

        // Reset selection animation after a bit
        setTimeout(() => {
            const reset = new Set(selectedIds);
            reset.delete(item.id);
            setSelectedIds(reset);
        }, 1000);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATALOG_ITEMS.map((item) => (
                <Card key={item.id} className="group overflow-hidden border-0 bg-white/50 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-2 right-2">
                            <Badge className="bg-white/90 text-slate-800 backdrop-blur shadow-sm">
                                {item.category}
                            </Badge>
                        </div>
                    </div>
                    <CardHeader className="p-4 pb-2">
                        <h3 className="font-semibold text-lg leading-tight text-slate-800">{item.name}</h3>
                        <p className="font-bold text-indigo-600 text-lg">${item.price.toLocaleString()}</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-slate-500">
                        {item.description}
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <Button
                            onClick={() => handleSelect(item)}
                            className={`w-full transition-all duration-300 ${selectedIds.has(item.id) ? "bg-green-500 hover:bg-green-600" : "bg-slate-900 hover:bg-indigo-600"}`}
                        >
                            {selectedIds.has(item.id) ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" /> Added
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" /> Add to Request
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            ))}

            {/* Custom Item Card */}
            <Card className="border-2 border-dashed border-slate-300 bg-transparent flex flex-col items-center justify-center p-6 text-center hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                    <ShoppingCart className="h-6 w-6 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-700">Custom Request</h3>
                <p className="text-sm text-slate-500 mt-2 mb-4">Need something not in the catalog?</p>
                <Button variant="outline">Fill Blank Form</Button>
            </Card>
        </div>
    );
}
