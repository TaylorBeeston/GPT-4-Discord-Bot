import express, { json } from 'express';
import fetch from 'node-fetch';
import { verifyKeyMiddleware } from 'discord-interactions';
import { REST } from '@discordjs/rest';
import {
    Client,
    API,
    GatewayIntentBits,
    InteractionType,
    InteractionResponseType,
    GatewayDispatchEvents,
} from '@discordjs/core';
import { WebSocketManager } from '@discordjs/ws';

import { openAi } from './openai';
import { discordToken, discordKey, channelId as _channelId, openAiToken } from './constants';

const rest = new REST({ version: '10' }).setToken(discordToken);
const gateway = new WebSocketManager({
    token: discordToken,
    intents:
        GatewayIntentBits.GuildMessages |
        GatewayIntentBits.MessageContent |
        GatewayIntentBits.DirectMessages,
    rest,
});

const client = new Client({ rest, gateway });

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
    memberId: string,
    isPrivate = false,
    messageId?: string
): Promise<string> {
    if (!isPrivate) {
        const messageObject = await api.channels.createMessage(channelId, {
            content: message,
            ...(messageId ? { message_reference: { message_id: messageId } } : {}),
        });

        return messageObject.id;
    }

    const dm = await api.users.createDM(memberId);
    const messageObject = await api.channels.createMessage(dm.id, {
        content: message,
        ...(messageId ? { message_reference: { message_id: messageId } } : {}),
    });

    return messageObject.id;
}

async function sendResponse(
    message: string,
    channelId: string,
    memberId: string,
    isPrivate = false
): Promise<string> {
    let id = '';

    const content = `<@${memberId}>\n > ${message}`;

    id = await sendMessage(isPrivate ? `> ${message}` : content, channelId, memberId, isPrivate);

    const gpt4Response = await callGPT4(message);

    console.log({ gpt4Response });

    if (gpt4Response.length > 2000) {
        const chunks = Array.from(gpt4Response.match(/[\s\S]{1,1975}/g) ?? []);

        for (let chunkIndex in chunks) {
            const chunk = chunks[chunkIndex];

            console.log({ id });

            id = await sendMessage(
                `${chunk}\n(${Number(chunkIndex) + 1}/${chunks.length})`,
                channelId,
                memberId,
                isPrivate,
                id
            );
        }
    } else {
        await sendMessage(gpt4Response, channelId, memberId, isPrivate, id);
    }

    return gpt4Response;
}

client.on(GatewayDispatchEvents.MessageCreate, async ({ data, api }) => {
    console.log(data);
});

client.once(GatewayDispatchEvents.Ready, () => console.log('Ready!'));

gateway.connect();

// Set up the Express server for handling interactions
const app = express();

app.get('/health-check', async (req, res) => {
    console.log('health', (req as any).requestContext);

    return res.sendStatus(200);
});

app.post('/generate', json(), async (req, res) => {
    console.log('Generating...', req.body);

    const { message, channelId, userId, token, isPrivate } = req.body;

    if (token !== discordKey) return res.sendStatus(401);

    await sendResponse(message, channelId, userId, isPrivate);

    return res.sendStatus(200);
});

app.post('/interactions', verifyKeyMiddleware(discordKey), async (req, res) => {
    const { type, data, member, token } = req.body;

    console.log('Got a request!', {
        type,
        data,
        member: JSON.stringify(member),
        token,
    });

    if (type === InteractionType.Ping) {
        return res.json({ type: InteractionResponseType.Pong });
    }

    if (type === InteractionType.ApplicationCommand) {
        if (data.name === 'chat') {
            const domainName: string = (req as any).requestContext.domainName;
            const message = req.body.data.options[0].value;
            const isPrivate = req.body.data.options[1]?.value;

            console.log({ message });

            fetch(`https://${domainName}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isPrivate,
                    token: discordKey,
                    message,
                    channelId: _channelId,
                    userId: member?.user?.id,
                }),
            });

            await new Promise(res => setTimeout(res, 100));

            return res.json({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: { content: 'Generating a response...' },
            });
        }
    }
});

export default app;
