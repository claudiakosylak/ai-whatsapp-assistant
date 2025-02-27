import OpenAI from "openai"
import dotenv from "dotenv"
import { addLog } from "./utils/controlPanel"
import { OpenAIMessage } from "./types"

dotenv.config()

export const processAssistantResponse = async (from: string, messages: OpenAIMessage[]) => {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID as string;

    const thread = await client.beta.threads.create({
        messages
    })

    addLog(`Created new thread: ${thread.id}`);

    let run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID
    })

    addLog(`Created new run: ${run.id}`);

    while (run.status !== "completed") {
        run = await client.beta.threads.runs.retrieve(thread.id, run.id)
        addLog(`Run status: ${run.status}`);
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    addLog("Run completed!");

    const messageResponse = await client.beta.threads.messages.list(thread.id)
    const messagesData = messageResponse.data
    const latestMessage = messagesData[0]
    const latestMessageContent: any = latestMessage.content[0]
    addLog(`Assistant response: ${latestMessageContent.text.value.substring(0, 100)}...`);
    const responseString = latestMessageContent.text.value
    const textResponse = {from: from, messageContent: responseString}
    return textResponse
}
