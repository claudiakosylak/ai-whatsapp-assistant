import OpenAI from 'openai';
import { addLog } from './controlPanel';
import {
  OpenAIAssistantMessage,
  OpenAIMessage,
  TestMessage,
  WhatsappResponseAsText,
} from '../types';
import { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } from '../config';
import { getAudioResponseEnabled, getPrompt } from './botSettings';
import { Message } from 'whatsapp-web.js';
import {
  FunctionToolCall,
  RunStepsPage,
} from 'openai/resources/beta/threads/runs/steps';
import { getIsAudio } from './messages';
import { AssistantTool } from 'openai/resources/beta/assistants';

export const processAssistantResponse = async (
  from: string,
  messages: OpenAIMessage[],
  message: Message | TestMessage,
): Promise<WhatsappResponseAsText | undefined> => {
  try {
    if (!OPENAI_API_KEY || !OPENAI_ASSISTANT_ID) {
      addLog(
        `Missing OpenAI key or Assistant ID. Please update your environment configuration and try again.`,
      );
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
        speakMessage: false,
      };
    }
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    const ASSISTANT_ID = OPENAI_ASSISTANT_ID as string;

    let thread;
    try {
      thread = await client.beta.threads.create({
        messages: messages as OpenAIAssistantMessage[],
      });
      addLog(`Created new thread: ${thread.id}`);
    } catch (error) {
      addLog(`Error creating thread: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
        speakMessage: false,
      };
    }

    let respondWithAudio: boolean = getIsAudio(message) ? true : false;

    let hasReacted;

    const doEmojiReaction = async (emoji: string) => {
      if (message && emoji) {
        try {
          await message.react(emoji);
          hasReacted = true;
          return { function: 'emojiReaction', result: 'success' };
        } catch (e) {
          addLog(`Error with emoji reaction: ${e}`);
          return { function: 'emojiReaction', result: 'error' };
        }
      }
    };

    const speak = () => {
      if (getAudioResponseEnabled()) {
        respondWithAudio = true;
        return { function: 'speak', result: 'success' };
      } else {
        return { function: 'speak', result: 'Audio messages are not enabled.' };
      }
    };

    const speakFunctionDeclaration = {
      type: 'function' as 'function',
      function: {
        name: 'speak',
        description:
          'When a user requests that you speak, read a message out loud or to send your response as audio, this will enable it.',
      },
    };

    const emojiReactionFunctionDeclaration = {
      type: 'function' as 'function',
      function: {
        name: 'emojiReaction',
        description:
          'When a user requests a response via emoji, responds with an appropriate emoji.',
        parameters: {
          type: 'object',
          properties: {
            emoji: {
              type: 'string',
              description: 'An emoji string.',
            },
          },
          required: ['emoji'],
        },
      },
    };

    const functions: { [key: string]: any } = {
      emojiReaction: ({ emoji }: { emoji: string }) => {
        return doEmojiReaction(emoji);
      },
      speak: () => {
        return speak();
      },
    };

    let run;
    try {
      run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
        additional_instructions: getPrompt(),
        tools: [emojiReactionFunctionDeclaration, speakFunctionDeclaration],
      });
      addLog(`Created new run: ${run.id}`);
    } catch (error) {
      addLog(`Error creating run: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
        speakMessage: false,
      };
    }

    let calls: AssistantTool[] = [];

    try {
      while (run.status !== 'completed' && run.status !== 'requires_action') {
        run = await client.beta.threads.runs.retrieve(thread.id, run.id);
        addLog(`Run status: ${run.status}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (run.status === 'completed') {
        addLog('Run completed!');
      }
      if (run.status === 'requires_action') {
        addLog(`Run requires use of tool.`);
      }
    } catch (error) {
      addLog(`Error retrieving run status: ${error}`);
    }

    if (run.tools.length > 0) {
      calls = run.tools;
      let toolCalls: FunctionToolCall[] = [];
      let callResults: { tool_call_id: string; output: string }[] = [];
      try {
        let runSteps: RunStepsPage = await client.beta.threads.runs.steps.list(
          thread.id,
          run.id,
        );
        runSteps.data.forEach(async (step) => {
          if (step.step_details.type === 'tool_calls') {
            for (let tool of step.step_details.tool_calls) {
              const currentTool = tool as FunctionToolCall;
              toolCalls.push(currentTool);
              addLog(`Calling tool function: ${currentTool.function.name}`);
              const result = await functions[currentTool.function.name](
                JSON.parse(currentTool.function.arguments),
              );
              callResults.push({
                tool_call_id: currentTool.id,
                output: JSON.stringify(result),
              });
            }
          }
        });
        run = await client.beta.threads.runs.submitToolOutputs(
          thread.id,
          run.id,
          {
            tool_outputs: callResults,
          },
        );

        try {
          while (run.status !== 'completed') {
            run = await client.beta.threads.runs.retrieve(thread.id, run.id);
            addLog(`Run status: ${run.status}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          if (run.status === 'completed') {
            addLog('Run completed!');
          }
        } catch (error) {
          addLog(`Error retrieving run status: ${error}`);
        }
      } catch (e) {
        addLog(`Error retrieving function call: ${e}`);
      }
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
        speakMessage: false,
      };
    }
    const messagesData = messageResponse.data;
    const latestMessage = messagesData[0];
    const latestMessageContent: any = latestMessage.content[0];
    if (!latestMessageContent && calls.length > 0) {
      return;
    }
    addLog(
      `Assistant response: ${latestMessageContent.text.value.substring(
        0,
        100,
      )}...`,
    );
    const responseString = latestMessageContent.text.value;
    let messageContent = responseString;

    const textResponse = {
      from: from,
      messageContent,
      rawText: responseString,
      speakMessage: respondWithAudio,
    };
    return textResponse;
  } catch (error) {
    addLog(`Unexpected error in processing assistant response: ${error}`);
    return {
      from,
      messageContent: 'There was an error processing your response.',
      rawText: 'Error',
      speakMessage: false,
    };
  }
};
