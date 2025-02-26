import OpenAI from "openai"
import dotenv from "dotenv"
import { ChatCompletionMessageParam } from "openai/resources"
import { addLog } from "./controlPanel"

dotenv.config()

export const processChatCompletionResponse = async (from: string, messages: ChatCompletionMessageParam[]) => {
    const client = new OpenAI({
        apiKey: process.env.OPEN_WEBUI_KEY,
        baseURL: process.env.OPEN_WEBUI_BASE_URL
    });

    const completion = await client.chat.completions.create({
        messages,
        model: process.env.OPEN_WEBUI_MODEL as string,
    })
    addLog(`Chat completion response: ${completion.choices[0].message.content?.substring(0, 100)}...`);
    const responseString = completion.choices[0].message.content

    return {from: from, messageString: responseString || "There was a problem with your request."}
}
