import { processResponse } from "./assistant"

const testMessage =     {
    "role": "user",
    "content": "What's the biggest star in our solar system?"
}

export type OpenAIMessage = {
    role: "user" | "assistant",
    content: string;
}

const testMessages: OpenAIMessage[] = [
    {
        role: "user",
        content: "What's the biggest star in our solar system?"
    }
]

processResponse(testMessages)
