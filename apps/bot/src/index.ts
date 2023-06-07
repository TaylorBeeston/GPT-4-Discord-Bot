import { REST } from '@discordjs/rest';
import { Client, GatewayIntentBits, Events, userMention, Partials, Message } from 'discord.js';
import { API } from '@discordjs/core';
import { OpenAIApi, Configuration, ChatCompletionRequestMessage } from 'openai';
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

function cleanMessageContent(content: string): string {
    return content.replace(userMention(client.user!.id), '').trim();
}

async function getMessageHistory(
    _message: Message<boolean>
): Promise<ChatCompletionRequestMessage[]> {
    const messages: ChatCompletionRequestMessage[] = [
        {
            role: 'user',
            content: cleanMessageContent(_message.content),
        },
    ];

    let isReply = Boolean(_message.reference);
    let message = _message;

    while (isReply) {
        message = await message.fetchReference();

        messages.unshift({
            role: message.author.id === client.user!.id ? 'assistant' : 'user',
            content: cleanMessageContent(message.content),
        });

        isReply = Boolean(message.reference);
    }

    console.log(messages);

    return messages;
}

async function callGPT4(messages: ChatCompletionRequestMessage[]): Promise<string> {
    const response = await openAi.createChatCompletion({ model: 'gpt-4', messages });

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
        let id = message.id;

        const placeholderId = await sendMessage('Generating response...', message.channelId, id);

        const gpt4Response = await callGPT4(await getMessageHistory(message));

        await api.channels.deleteMessage(message.channelId, placeholderId);

        console.log({ gpt4Response });

        if (gpt4Response.length > 2000) {
            const chunks = Array.from(gpt4Response.match(/[\s\S]{1,1975}/g) ?? []);

            for (let chunkIndex in chunks) {
                const chunk = chunks[chunkIndex];

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
