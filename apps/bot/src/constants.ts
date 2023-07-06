import { Persona } from './types';
import { config } from 'dotenv';

config();

export const DEFAULT_PERSONA: Persona = {
    name: 'HAL',
    description: 'Default GPT 4 Bot',
    systemPrompt: '',
};

export const discordToken = process.env.DISCORD_TOKEN!;
export const discordKey = process.env.DISCORD_APPLICATION_KEY!;
export const applicationId = process.env.APPLICATION_ID!;
export const guildId = process.env.GUILD_ID!;
export const channelId = process.env.CHANNEL_ID!;
export const openAiToken = process.env.OPENAI_API_TOKEN!;
export const keyVUrl = process.env.KEYV_URL!;
export const dbKey = process.env.DB_KEY || 'currentPersona';

if (!discordToken) throw new Error('Discord Token not set!');
if (!discordKey) throw new Error('Discord Application Key not set!');
if (!applicationId) throw new Error('Application ID not set!');
if (!guildId) throw new Error('Guild ID not set!');
if (!channelId) throw new Error('Channel ID not set!');
if (!openAiToken) throw new Error('OpenAI Token not set!');
if (!keyVUrl) throw new Error('KeyV URL not set!');
