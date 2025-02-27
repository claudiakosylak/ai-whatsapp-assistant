import dotenv from "dotenv"

dotenv.config()

export const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const OPEN_WEBUI_KEY = process.env.OPEN_WEBUI_KEY
export const OPEN_WEBUI_BASE_URL = process.env.OPEN_WEBUI_BASE_URL
export const OPEN_WEBUI_MODEL = process.env.OPEN_WEBUI_MODEL as string
