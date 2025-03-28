import fs from 'fs';
import { AUDIO_DIR, audioHandlingApis } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { MessageMedia } from 'whatsapp-web.js';
import { Readable } from 'stream';
import { ElevenLabsClient } from 'elevenlabs';
import { ELEVEN_LABS_API_KEY, OPENAI_API_KEY } from '../config';
import { addLog } from './controlPanel';
import OpenAI, { toFile } from 'openai';
import { WhatsappResponse, WhatsappResponseAsText } from '../types';
import { getAudioMode, getOpenAiVoice } from './botSettings';
import { setError } from './errors';

export const deleteAudioFiles = () => {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    return;
  }

  // Read the contents of the audio directory
  fs.readdir(AUDIO_DIR, (err, files) => {
    if (err) {
      console.error('Error reading audio directory:', err);
      return;
    }

    // Iterate over each file and delete it
    files.forEach((file) => {
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
  addLog(
    `[ElevenLabs] Creating speech audio for: "${messageString.substring(
      0,
      100,
    )}...}"`,
  );
  try {
    const elevenLabsClient = new ElevenLabsClient({
      apiKey: ELEVEN_LABS_API_KEY,
    });

    let response;
    try {
      response = await elevenLabsClient.textToSpeech.convert(
        'IuRRIAcbQK5AQk1XevPj',
        {
          text: messageString,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
        },
      );
    } catch (error) {
      addLog(`[ElevenLabs->speech] Error generating audio: ${error}`);
      throw error;
    }

    addLog(`[ElevenLabs->speech] Audio Creation OK`);

    try {
      const base64Audio = await streamToBase64(response);
      return base64Audio;
    } catch (error) {
      addLog(
        `[ElevenLabs->speech] Error converting stream to Base64: ${error}`,
      );
      throw error;
    }
  } catch (error) {
    addLog(`[ElevenLabs->speech] Unexpected error in getting audio: ${error}`);
    throw error;
  }
};

export const getBase64WithOpenAI = async (messageString: string) => {
  addLog(
    `[OpenAI] Creating speech audio for: "${messageString.substring(
      0,
      100,
    )}...}"`,
  );

  try {
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    const response: any = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: getOpenAiVoice(),
      input: messageString,
      response_format: 'mp3',
    });
    addLog(`[OpenAI->speech] Audio Creation OK`);
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const base64Audio = audioBuffer.toString('base64');
    return base64Audio;
  } catch (error) {
    addLog(`[OpenAI->speech] Error generating audio: ${error}`);
    throw error;
  }
};

export function bufferToStream(buffer: any) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export const transcribeVoiceWithElevenLabs = async (
  media: MessageMedia,
): Promise<string> => {
  try {
    const client = new ElevenLabsClient({ apiKey: ELEVEN_LABS_API_KEY });
    // Convert the base64 media data to a Buffer
    const audioBuffer = Buffer.from(media.data, 'base64');
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    );
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });

    addLog(`[ElevenLabs] Starting audio transcription`);

    const transcription = await client.speechToText.convert({
      file: audioBlob,
      model_id: 'scribe_v1', // Model to use, for now only "scribe_v1" is supported
      tag_audio_events: false, // Tag audio events like laughter, applause, etc.
      diarize: false, // Whether to annotate who is speaking
    });

    // Log the transcribed text
    addLog(
      `[ElevenLabs] Transcribed text: ${transcription.text.substring(0, 100)}`,
    );

    return transcription.text;
  } catch (error: any) {
    // Error handling
    addLog(`Error transcribing voice message: ${error.message}`);
    throw error;
  }
};

export const transcribeVoiceWithOpenAI = async (
  media: MessageMedia,
): Promise<string> => {
  try {
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    // Convert the base64 media data to a Buffer
    const audioBuffer = Buffer.from(media.data, 'base64');
    // Convert the buffer to a stream
    const audioStream = bufferToStream(audioBuffer);

    addLog(`[OpenAI] Starting audio transcription`);

    const file = await toFile(audioStream, 'audio.ogg', { type: 'audio/ogg' });
    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: 'gpt-4o-mini-tts',
    });
    addLog(
      `[OpenAI] Transcribed text: ${transcription.text.substring(0, 100)}`,
    );

    return transcription.text;
  } catch (error: any) {
    // Error handling
    addLog(`Error transcribing voice message: ${error.message}`);
    throw error;
  }
};

export async function transcribeVoice(media: MessageMedia): Promise<string> {
  try {
    if (getAudioMode() === 'ELEVEN_LABS') {
      return await transcribeVoiceWithElevenLabs(media);
    } else {
      return await transcribeVoiceWithOpenAI(media);
    }
  } catch (e: any) {
    if ((e.status && e.status === 401) || (e.statusCode && e.statusCode === 401)) {
      setError(
        'audioModeError',
        `Your API key for ${
          audioHandlingApis[getAudioMode()]
        } is either incorrect or missing. Please update your key to allow your bot to transcribe and speak messages.`,
      );
    }
    throw e;
  }
}

export const createSpeechResponseContent = async (messageString: string) => {
  try {
    let response;
    if (getAudioMode() === 'ELEVEN_LABS') {
      response = await getBase64WithElevenLabs(messageString);
    } else {
      response = await getBase64WithOpenAI(messageString);
    }
    let audioMedia = new MessageMedia('audio/mp3', response, 'voice.mp3');

    return audioMedia;
  } catch (e: any) {
    addLog('Trouble creating speech');
    addLog(e);
    throw e;
  }
};

export const convertToAudioResponse = async (
  textResponse: WhatsappResponseAsText,
): Promise<WhatsappResponse> => {
  try {
    let audioContent = await createSpeechResponseContent(
      textResponse.messageContent,
    );
    return {
      from: textResponse.from,
      messageContent: audioContent,
      rawText: textResponse.rawText,
    };
  } catch (error) {
    addLog(`Error creating speech response: ${error}`);
    return {
      from: textResponse.from,
      messageContent: `There was an error in creating an audio response. Here is the response as text: ${textResponse.messageContent}`,
      rawText: textResponse.rawText,
    };
  }
};
