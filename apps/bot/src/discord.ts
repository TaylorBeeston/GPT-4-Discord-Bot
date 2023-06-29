import { REST } from '@discordjs/rest';
import { Client, GatewayIntentBits, userMention, Partials, Message } from 'discord.js';
import { API } from '@discordjs/core';
import { ChatCompletionRequestMessage } from 'openai';

import { discordToken } from './constants';

export const rest = new REST({ version: '10' }).setToken(discordToken);

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Channel],
});

export const api = new API(rest);

export const cleanMessageContent = (content: string): string => {
    return content.replace(userMention(client.user!.id), '').trim();
};

export const cleanUsername = (username: string): string => {
    return username.replace(/[^a-z0-9_]/gi, '').slice(0, 63);
};

export const getMessageHistory = async (
    _message: Message<boolean>
): Promise<ChatCompletionRequestMessage[]> => {
    const messages: ChatCompletionRequestMessage[] = [
        {
            role: 'user',
            content: cleanMessageContent(_message.content),
            name: cleanUsername(_message.author.username),
        },
    ];

    let isReply = Boolean(_message.reference);
    let message = _message;

    while (isReply) {
        message = await message.fetchReference();

        const clientIsAuthor = message.author.id === client.user!.id;

        messages.unshift({
            role: clientIsAuthor ? 'assistant' : 'user',
            content: cleanMessageContent(message.content),
            ...(clientIsAuthor ? {} : { name: message.author.username }),
        });

        isReply = Boolean(message.reference);
    }

    return messages;
};

export const sendMessage = async (
    message: string,
    channelId: string,
    messageId?: string
): Promise<string> => {
    const messageObject = await api.channels.createMessage(channelId, {
        content: message,
        ...(messageId ? { message_reference: { message_id: messageId } } : {}),
    });

    return messageObject.id;
};
