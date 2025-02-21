import OpenAI from "openai"
import dotenv from "dotenv"
import { OpenAIMessage } from "."

dotenv.config()

const ASSISTANT_ID = process.env.ASSISTANT_ID as string

const client = new OpenAI({
    apiKey: process.env.API_KEY
})

export const processResponse = async (messages: OpenAIMessage[]) => {
    const thread = await client.beta.threads.create({
        messages
    })

    let run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID
    })

    console.log("Run created")

    while (run.status !== "completed") {
        run = await client.beta.threads.runs.retrieve(thread.id, run.id)
        console.log("Run status: ", run.status)
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    console.log("Run completed!")

    const messageResponse = await client.beta.threads.messages.list(thread.id)
    const messagesData = messageResponse.data
    const latestMessage = messagesData[0]
    console.log("response: ", latestMessage.content[0])
}
