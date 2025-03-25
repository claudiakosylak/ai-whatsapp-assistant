# WhatsApp Assistant

An AI-powered WhatsApp assistant with the ability to handle messages, automate responses, and provide intelligent interactions. Admins have the flexibility to choose and switch between multiple integrations, adjust assistant settings and conduct mock conversations in a user-friendly control panel.

## Features

- Integrates with WhatsApp to handle messages automatically
- Choose and switch between various assistant APIs:
    - Chat Completions API with OpenAI
    - Chat Completions API with custom Open WebUI Implementation
    - OpenAI Assistant API
    - Gemini API
    - Dify API
- Test bot behavior in local control panel playground
- Customizable response behavior
- Easy to deploy and extend

## Prerequisites

Before setting up, ensure you have:

- Node.js installed
- A key for at least one of the supported APIs
- A whatsapp account for your bot to use

## Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/claudiakosylak/openai-whatsapp-assistant.git
   cd openai-whatsapp-assistant
   ```

2. Install dependencies for backend:
   ```sh
   npm install
   ```

    Install dependencies for frontend:
    ```sh
    cd frontend/ npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add the following API keys and/or base URLs based on your needs:
        - To use OpenAI Chat Completions API:
            - OPENAI_API_KEY, OPENAI_MODEL
        - To use OpenAI Assistant API:
            - OPENAI_API_KEY, OPENAI_ASSISTANT_ID
        - To use Open WebUI Chat Completions:
            - OPEN_WEBUI_KEY, OPEN_WEBUI_BASE_URL, OPEN_WEBUI_MODEL
        - To use Gemini:
            - GEMINI_API_KEY, GEMINI_MODEL
        - To use an Agent through the Dify API:
            - DIFY_API_KEY, DIFY_BASE_URL
        - To enable audio transcriptions and speech with Eleven Labs:
            - ELEVEN_LABS_API_KEY
        - To enable audio transcriptions and speech with OpenAI:
            - OPENAI_API_KEY
    - (Optional) Edit the variables with DEFAULT_ prefix to set your default settings on bot restart (other settings changed in the control panel will reset to default if bot is restarted)

4. Start the application:

    To run in dev mode with both the WhatsApp client and the control panel:

    ```sh
    npm run dev
    ```

    To run in dev mode with only the Control Panel (do not start Whatsapp client):

    ```sh
    npm run testmode
    ```

    To build:

    ```sh
    npm start
    ```
5. On initial launch, you must wait a moment for a QR code to appear in your terminal. Open your Whatsapp > settings > link device to scan the code and connect. On subsequent restarts, you will only have to wait for the client to start unless you unlink the device.

6. Open your local control panel at the port listed in your terminal, for example http://localhost:5173/

## Configuration

### Gemini API

Currently, the bot supports image analysis, document analysis and emoji reactions via tool call depending on the model used. Image generation is currently supported if using gemini-2.0-flash-exp experimental model, however, document analysis and emoji reactions will not work with this model. The experimental model also will not recognize the custom prompt at this time.

### Dify API

If you are using Dify, create an Agent and add the following variables into the instructions box:
    - customPrompt: paragraph
    - botName: string, required
    - contextLimit: number, required
    - maxMessageAge: number, required

This will allow you to control how the Agent responds from your control panel.

Here is an example:

"Your name is {{botName}}. Limit yourself to only using the last {{contextLimit}} messages in this conversation as context to formulate your responses, and also ignore messages that are more than {{maxMessageAge}} old. {{customPrompt}}"

## Usage

** Do not host this on a public server!! API keys are intentionally exposed to the client for ease of use in the control panel, and it is only meant to be run in a secure local environment. **

### Commands

The following commands are available directly from messages in Whatsapp:

- -help: Show this help message
- -reset: Reset conversation context
- -update [prompt]: Update the custom prompt
- -mode [assistant|chat|chat-webui|dify|gemini]: Switch between OpenAI Assistant, OpenAI Chat, Open WebUI Chat, Dify and Gemini modes
- -status: Show current bot settings
- -sendTo: Send message to a certain number

You may enable or disable the -reset command in the control panel.

### Group Chat

The bot will respond in group chats only if its name is mentioned in the message or if a user replies to the bot.

### Audio (transcriptions and speech)

Regardless of the selected chat API, all audio transcriptions and bot speech will be processed by the selected audio API. If the correct API keys are not present, the bot will not be able to respond to audio messages or consider them in the message context.

You may enable/disable whether the bot is to respond with voice messages from the control panel.

### Control Panel

You may actively change your bot's settings, view logs, test bot behavior through a test chat playground and even update environment variables from the local control panel.

#### Custom Prompt and Bot Settings

- Custom Prompt: Update system instructions for the bot.
- Bot Name: In group chats, the bot will only respond to messages where its name is mentioned or to direct replies.
- Message history limit and max message age: This determines how many messages the bot will use as context for its response.    -- Note that if the bot is restarted, all conversation contexts are reset if using Dify API.
- Enable/disable reset command: Whether sending message with content -reset will reset conversation context.

Actively selected bot settings will apply to both Whatsapp (if connected) and the test chat box. Settings will reset on bot restart. Update environment variables with prefix DEFAULT_ to set defaults.

#### Logs

View all recent logs from the Whatsapp bot and your test chat for convenience and debugging.

#### Configuration

Update environment variables like API keys and models to update without restarting the bot. Changes to variables with prefix DEFAULT_ will take effect on next restart.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
