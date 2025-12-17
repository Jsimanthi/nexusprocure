import logger from '@/lib/logger';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Schema for the PO structure we want the LLM to generate
const POSchema = z.object({
    title: z.string().describe("A brief title for the Purchase Order"),
    items: z.array(z.object({
        itemName: z.string().describe("Name of the item"),
        description: z.string().optional().describe("Description of the item"),
        quantity: z.number().int().describe("Quantity needed"),
        category: z.string().optional().describe("Category of the item (e.g., Electronics, Furniture)"),
    })),
    vendorName: z.string().optional().describe("Intended vendor if mentioned"),
    expectedDeliveryDate: z.string().optional().describe("ISO date string for delivery if mentioned"),
    justification: z.string().optional().describe("Reason for purchase if inferred")
});

export class AIService {
    /**
     * Generates a structured PO draft from a natural language prompt.
     * @param prompt User's text input (e.g., "I need 5 laptops for the design team")
     */
    static async generatePOFromPrompt(prompt: string) {
        try {
            logger.info({ prompt }, "Generating PO from prompt");

            const { object } = await generateObject({
                model: openai('gpt-4o'), // Users can configure model map if needed
                schema: POSchema,
                prompt: `You are a procurement assistant. Extract purchase intent from this text: "${prompt}".
        If the user implies a specific vendor (e.g. "from Dell"), include it.
        Return a structured JSON object.`,
            });

            return object;
        } catch (error) {
            logger.error({ error }, "Failed to generate PO from prompt");
            throw new Error("AI Service failed to parsing request.");
        }
    }

    /**
     * Analyzes a vendor's risk profile based on provided news/context text.
     * This is a simulation for now, to be connected to a real news feed later.
     */
    static async analyzeGenericRisk(vendorName: string, recentNewsSummary: string) {
        try {
            const { object } = await generateObject({
                model: openai('gpt-4o'),
                schema: z.object({
                    riskScore: z.number().min(0).max(100).describe("0 = Safe, 100 = Critical Risk"),
                    riskFactors: z.array(z.string()).describe("List of potential risks found"),
                    summary: z.string().describe("Brief executive summary of risk")
                }),
                prompt: `Analyze the risk for vendor "${vendorName}" based on this news summary: "${recentNewsSummary}".
            If the news is negative (lawsuits, bankruptcy, delays), score high.
            If neutral/positive, score low.`
            });
            return object;
        } catch (error) {
            logger.warn({ error }, "Failed to analyze risk");
            return { riskScore: 0, riskFactors: [], summary: "Risk analysis unavailable" };
        }
    }
}
