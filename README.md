# OpenAI WhatsApp Assistant

An AI-powered WhatsApp assistant with the ability to handle messages, automate responses, and provide intelligent interactions. Admins have the flexibility to choose and switch between multiple integrations, adjust assistant settings and conduct mock conversations in a user-friendly control panel.

## Features

- Integrates with WhatsApp to handle messages automatically
- Choose and switch between various assistant APIs:
    - OpenAI Assistant API
    - Chat Completions API with Open WebUI
    - Dify Agents
- Customizable response behavior
- Easy to deploy and extend

## Prerequisites

Before setting up, ensure you have:

- Node.js installed (>= v14)
- A key for at least one of the supported APIs

## Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/claudiakosylak/openai-whatsapp-assistant.git
   cd openai-whatsapp-assistant
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add the following API keys and/or base URLs based on your needs:
        - To use OpenAI Assistant API:
            - OPENAI_API_KEY, OPENAI_ASSISTANT_ID
        - To use Open WebUI with Chat Completions:
            - OPEN_WEBUI_KEY, OPEN_WEBUI_BASE_URL, OPEN_WEBUI_MODEL
        - To use an Agent through the Dify API:
            - DIFY_API_KEY, DIFY_BASE_URL
        - To enable voice responses and input processing:
            - ELEVEN_LABS_API_KEY

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

## Configuration

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

In progress

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
