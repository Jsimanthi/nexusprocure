import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        model: openai("gpt-4o"),
        system: `You are Nexus AI, an intelligent procurement assistant for NexusProcure.
    
    You have access to:
    - Purchase Orders (POs) status and details
    - Inter-Office Memos (IOMs)
    - Payment Requests (PRs)
    - Vendor performance data
    - Spending analytics

    Your goal is to help users navigate the procurement process, identify bottlenecks, and make smart spending decisions.
    
    Tone: Professional, helpful, and concise.
    `,
        messages: convertToCoreMessages(messages),
    });

    return result.toTextStreamResponse();
}
