import fs from 'fs';
import { AUDIO_DIR } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { MessageMedia } from 'whatsapp-web.js';
import { Readable } from 'stream';
import { ElevenLabsClient } from 'elevenlabs';
import { ELEVEN_LABS_API_KEY, OPENAI_API_KEY } from '../config';
import { addLog } from './controlPanel';
import OpenAI from 'openai';

export const deleteAudioFiles = () => {
    // Read the contents of the audio directory
    fs.readdir(AUDIO_DIR, (err, files) => {
        if (err) {
            console.error('Error reading audio directory:', err);
            return;
        }

        // Iterate over each file and delete it
        files.forEach(file => {
            const filePath = path.join(AUDIO_DIR, file);

            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                } else {
                    console.log(`Deleted file: ${file}`);
                }
            });
        });
    });
};


export const saveAudioFile = (mediaContent: MessageMedia): string => {
    const { mimetype, data } = mediaContent;

    // Get file extension from mimetype (e.g., "audio/mp3" -> "mp3")
    const extension = mimetype.split('/')[1];
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(AUDIO_DIR, fileName);

    // Convert base64 data to buffer and write to file
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Return the accessible URL (assuming it's served statically)
    return `/audio/${fileName}`;
};

export async function streamToBase64(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('base64');
}

export const getBase64WithElevenLabs = async (messageString: string) => {
    const elevenLabsClient = new ElevenLabsClient({
        apiKey: ELEVEN_LABS_API_KEY
    })

    const response = await elevenLabsClient.textToSpeech.convert("IuRRIAcbQK5AQk1XevPj", {
        text: messageString,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128"
    })
    addLog(`[OpenAI->speech] Audio Creation OK`);
    const base64Audio = await streamToBase64(response)
    return base64Audio
}

export const getBase64WithOpenAI = async (messageString: string) => {

        const client = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        const response: any = await client.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: messageString,
          response_format: 'mp3'
        });
        addLog(`[OpenAI->speech] Audio Creation OK`);
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        return audioBuffer
}
