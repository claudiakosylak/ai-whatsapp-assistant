import { ChatCompletionMessageParam } from 'openai/resources';
import { addLog } from './controlPanel';
import { DIFY_API_KEY, DIFY_BASE_URL } from '../config';

const headers = {
  Authorization: `Bearer ${DIFY_API_KEY}`,
  'Content-Type': 'application/json',
};

export const processDifyResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
) => {
  try {
    addLog('Processing divy response.');
    const lastMessage = messages[messages.length - 1];
    const messageContent = lastMessage.content as string;
    const response = await fetch(`http://localhost:3001/proxy/dify`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        inputs: {},
        query: messageContent,
        response_mode: 'blocking',
        // conversation_id: '',
        // user: from,
      }),
    });

    const tempData = await response.json()

    addLog(`response: ${JSON.stringify(tempData)}`)

    // let responseString = 'There was a problem with your request.';
    // if (!response.ok) {
    //   addLog(
    //     `Error getting divy response: ${response.status} - ${response.statusText}`,
    //   );
    //   throw new Error();
    // }

    // const data = await response.json();

    // addLog(`Divy response: ${data.answer.substring(0, 100)}...`);

    // responseString = data.answer;

    // return {
    //   from,
    //   messageContent: responseString,
    //   rawText: responseString,
    // };
    return {
      from,
      messageContent: 'test',
      rawText: 'test',
    };
  } catch (error) {
    addLog("catch in process helper")
    throw error;
  }
};
