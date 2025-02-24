import OpenAI from "openai"
import dotenv from "dotenv"
import { ChatCompletionMessageParam } from "openai/resources"

dotenv.config()

const client = new OpenAI({
    apiKey: process.env.OPEN_WEBUI_KEY,
    baseURL: process.env.OPEN_WEBUI_BASE_URL
})

export const processChatCompletionResponse = async (from: string, messages: ChatCompletionMessageParam[]) => {

    const completion = await client.chat.completions.create({
        messages,
        model: process.env.OPEN_WEBUI_MODEL as string,
    })
    console.log(completion.choices[0].message.content)
    const responseString = completion.choices[0].message.content

    return {from: from, messageString: responseString || "There was a problem with your request."}
}
