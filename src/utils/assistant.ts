import OpenAI from 'openai';
import { addLog } from './controlPanel';
import { OpenAIMessage, WhatsappResponseAsText } from '../types';
import { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } from '../config';

export const processAssistantResponse = async (
  from: string,
  messages: OpenAIMessage[],
): Promise<WhatsappResponseAsText> => {
  try {
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    const ASSISTANT_ID = OPENAI_ASSISTANT_ID as string;

    let thread;
    try {
      thread = await client.beta.threads.create({ messages });
      addLog(`Created new thread: ${thread.id}`);
    } catch (error) {
      addLog(`Error creating thread: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
      };
    }

    let run;
    try {
      run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
      });
      addLog(`Created new run: ${run.id}`);
    } catch (error) {
      addLog(`Error creating run: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
      };
    }

    addLog(`Created new run: ${run.id}`);

    try {
      while (run.status !== 'completed') {
        run = await client.beta.threads.runs.retrieve(thread.id, run.id);
        addLog(`Run status: ${run.status}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      addLog('Run completed!');
    } catch (error) {
      addLog(`Error retrieving run status: ${error}`);
    }

    let messageResponse;
    try {
      messageResponse = await client.beta.threads.messages.list(thread.id);
    } catch (error) {
      addLog(`Error retrieving assistant response: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
      };
    }
    const messagesData = messageResponse.data;
    const latestMessage = messagesData[0];
    const latestMessageContent: any = latestMessage.content[0];
    addLog(
      `Assistant response: ${latestMessageContent.text.value.substring(
        0,
        100,
      )}...`,
    );
    const responseString = latestMessageContent.text.value;
    let messageContent = responseString
    const textResponse = {
      from: from,
      messageContent,
      rawText: responseString,
    };
    return textResponse;
  } catch (error) {
    addLog(`Unexpected error in processing assistant response: ${error}`);
    return {
      from,
      messageContent: 'There was an error processing your response.',
      rawText: 'Error',
    };
  }
};
