import { ChatCompletionMessageParam } from 'openai/resources';
import { DIVY_API_KEY, DIVY_BASE_URL } from '../config';
import { addLog } from './controlPanel';

const headers = {
  Authorization: `Bearer ${DIVY_API_KEY}`,
  'Content-Type': 'application/json',
};

export const processDivyResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
) => {
  addLog('Processing divy response.');
  const lastMessage = messages[messages.length - 1];
  const messageContent = lastMessage.content as string;
  const response = await fetch(`${DIVY_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: {},
      query: messageContent,
      response_mode: 'blocking',
      conversation_id: '',
      user: from,
      //   files: [
      //     {
      //       type: "image",
      //       transfer_method: "remote_url",
      //       url: "https://cloud.dify.ai/logo/logo-site.png"
      //     }
      //   ]
    }),
  });

  let responseString = 'There was a problem with your request.';
  if (!response.ok) {
    addLog(
      `Error getting divy response: ${response.status} - ${response.statusText}`,
    );
  }

  const data = await response.json();

  addLog(`Divy response: ${data.answer.substring(0, 100)}...`);

  responseString = data.answer;

  return {
    from,
    messageContent: responseString,
    rawText: responseString,
  };
};
