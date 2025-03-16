import OpenAI from 'openai';
import { addLog } from './controlPanel';
import { OpenAIMessage, WhatsappResponseAsText } from '../types';
import { OPENAI_API_KEY, OPENAI_ASSISTANT_ID } from '../config';
import { getBotName, getCustomPrompt } from './botSettings';
import { Message } from 'whatsapp-web.js';
import {
  FunctionToolCall,
  RunStepsPage,
  ToolCall,
} from 'openai/resources/beta/threads/runs/steps';

export const processAssistantResponse = async (
  from: string,
  messages: OpenAIMessage[],
  message: Message,
): Promise<WhatsappResponseAsText> => {
  try {
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    const ASSISTANT_ID = OPENAI_ASSISTANT_ID as string;

    if (!OPENAI_API_KEY || !OPENAI_ASSISTANT_ID) {
      addLog(
        `Missing OpenAI key or Assistant ID. Please update your environment configuration and try again.`,
      );
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
      };
    }

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

    const doEmojiReaction = (emoji: string) => {
      if (message && emoji) {
        try {
          message.react(emoji);
          return;
        } catch (e) {
          addLog(`Error with emoji reaction: ${e}`);
          return;
        }
      }
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
    };

    let run;
    try {
      run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
        additional_instructions: `Your name is ${getBotName()}. ${getCustomPrompt()}`,
        tools: [emojiReactionFunctionDeclaration],
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
        addLog(`Run requires use of tool.`)
      }
    } catch (error) {
      addLog(`Error retrieving run status: ${error}`);
    }

    if (run.tools.length > 0) {
      let toolCall: FunctionToolCall | undefined;
      try {
        let runSteps: RunStepsPage = await client.beta.threads.runs.steps.list(
          thread.id,
          run.id,
        );
        runSteps.data.forEach(async (step) => {
          if (step.step_details.type === 'tool_calls') {
            toolCall = step.step_details.tool_calls[0] as FunctionToolCall;
          }
        });
        if (toolCall) {
          addLog(`Calling tool function: ${toolCall.function.name}`)
          return await functions[toolCall.function.name](
            JSON.parse(toolCall.function.arguments),
          );
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
    let messageContent = responseString;
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
