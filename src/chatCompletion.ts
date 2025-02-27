import OpenAI from "openai"
import dotenv from "dotenv"
import { ChatCompletionMessageParam } from "openai/resources"
import { addLog } from "./controlPanel"
import { MessageMedia } from "whatsapp-web.js"
import { enableAudioResponse } from "./config"
import {ElevenLabsClient} from 'elevenlabs'
import { Readable } from 'stream';

dotenv.config()

async function streamToBase64(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('base64');
}

const createSpeechResponseContent = async (client: OpenAI, messageString: string) => {

        try {
            addLog(`[OpenAI->speech] Creating speech audio for: "${messageString.substring(0, 100)}...}"`);

            // const response: any = await client.audio.speech.create({
            //   model: 'tts-1',
            //   voice: 'nova',
            //   input: messageString,
            //   response_format: 'mp3'
            // });

            const elevenLabsClient = new ElevenLabsClient({
                apiKey: process.env.ELEVEN_LABS_API_KEY
            })

            const response = await elevenLabsClient.textToSpeech.convert("IuRRIAcbQK5AQk1XevPj", {
                text: messageString,
                model_id: "eleven_multilingual_v2",
                output_format: "mp3_44100_128"
            })

            // const voice = new ElevenLabs({
            //     apiKey: process.env.ELEVEN_LABS_API_KEY,
            //     voiceId: "IuRRIAcbQK5AQk1XevPj" //doga turkish voice
            //   })

            // const response = await voice.textToSpeechStream({
            //     voiceId: "IuRRIAcbQK5AQk1XevPj",
            //     textInput: messageString,
            //     stability: 0.5,
            //     similarityBoost: 0.75,
            //     style: 0.5,
            //     speakerBoost: true,
            //     modelId: "eleven_multilingual_v2",
            //     responseType: "arraybuffer"
            // } as any)

            addLog(`[OpenAI->speech] Audio Creation OK`);

            // const audioBuffer = Buffer.from(await response.arrayBuffer());
            const base64Audio = await streamToBase64(response)
            let audioMedia = new MessageMedia('audio/mp3', base64Audio, 'voice.mp3');

            return audioMedia;
        } catch (e: any) {
            addLog("Trouble creating speech")
            addLog(e)
            throw e;
        }

}

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
    const responseString = completion.choices[0].message.content || "There was a problem with your request."

    let messageContent: MessageMedia | string = responseString
    if (enableAudioResponse) {
        messageContent = await createSpeechResponseContent(client, responseString)
    }

    const response = {from: from, messageContent }

    return response
}
