import { REST } from '@discordjs/rest';
import { Client, GatewayIntentBits, Events, userMention, Partials } from 'discord.js';
import { API } from '@discordjs/core';
import { OpenAIApi, Configuration } from 'openai';
import { config } from 'dotenv';

config();

const discordToken = process.env.DISCORD_TOKEN;
const discordKey = process.env.DISCORD_APPLICATION_KEY;
const applicationId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const _channelId = process.env.CHANNEL_ID;
const openAiToken = process.env.OPENAI_API_TOKEN;

if (!discordToken) throw new Error('Discord Token not set!');
if (!discordKey) throw new Error('Discord Application Key not set!');
if (!applicationId) throw new Error('Application ID not set!');
if (!guildId) throw new Error('Guild ID not set!');
if (!_channelId) throw new Error('Channel ID not set!');
if (!openAiToken) throw new Error('OpenAI Token not set!');

const openAi = new OpenAIApi(new Configuration({ apiKey: openAiToken }));

const rest = new REST({ version: '10' }).setToken(discordToken);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Channel],
});

const api = new API(rest);

async function callGPT4(message: string): Promise<string> {
    const response = await openAi.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
    });

    return response.data.choices[0]?.message?.content ?? '';
}

async function sendMessage(
    message: string,
    channelId: string,
    messageId?: string
): Promise<string> {
    const messageObject = await api.channels.createMessage(channelId, {
        content: message,
        ...(messageId ? { message_reference: { message_id: messageId } } : {}),
    });

    return messageObject.id;
}

client.login(discordToken);

client.on(Events.MessageCreate, async message => {
    if (message.mentions.has(client.user!.id) && message.author.id !== client.user!.id) {
        const content = message.content.replace(userMention(client.user!.id), '').trim();

        let id = message.id;

        const placeholderId = await sendMessage('Generating response...', message.channelId, id);

        const gpt4Response = await callGPT4(content);

        await api.channels.deleteMessage(message.channelId, placeholderId);

        console.log({ gpt4Response });

        if (gpt4Response.length > 2000) {
            const chunks = Array.from(gpt4Response.match(/[\s\S]{1,1975}/g) ?? []);

            for (let chunkIndex in chunks) {
                const chunk = chunks[chunkIndex];

                console.log({ id });

                id = await sendMessage(
                    `${chunk}\n(${Number(chunkIndex) + 1}/${chunks.length})`,
                    message.channelId,
                    id
                );
            }
        } else {
            await sendMessage(gpt4Response, message.channelId, id);
        }
    }
});

client.on(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});
