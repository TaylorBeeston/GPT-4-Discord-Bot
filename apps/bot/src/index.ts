import { Events, InteractionType } from 'discord.js';

import { DEFAULT_PERSONA, channelId } from './constants';

import { addSystemPrompt, callGPT4 } from './openai';
import { client, api, getMessageHistory, sendMessage } from './discord';
import { applicationId, guildId, discordToken } from './constants';
import { commands } from './commands';
import { keyv } from './storage';
import { setPersona } from './persona';

let currentPersona = DEFAULT_PERSONA;

client.login(discordToken);

client.on(Events.MessageCreate, async message => {
    if (!message.mentions.has(client.user!.id) || message.author.bot) return;

    let id = message.id;

    const placeholderId = await sendMessage('Generating response...', message.channelId, id);

    const messages = await addSystemPrompt(await getMessageHistory(message));

    console.log({ messages });

    const gpt4Response = await callGPT4(messages);

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
});

client.on(Events.ClientReady, async c => {
    try {
        console.log(`Ready! Logged in as ${c.user.tag}`);
        console.log('Started refreshing application (/) commands.');

        await api.applicationCommands.bulkOverwriteGuildCommands(applicationId, guildId, commands);

        console.log('Successfully reloaded application (/) commands.');

        keyv.get('currentPersona').then(async persona => {
            console.log({ persona });

            await setPersona(persona || DEFAULT_PERSONA);
        });
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.commandName === 'set-persona') {
            const [nameOption, descriptionOption, promptOption] = interaction.options.data;
            const name = nameOption?.value;
            const description = descriptionOption?.value;
            const prompt = promptOption?.value;

            if (name && description && prompt) {
                const persona = { name, description, systemPrompt: prompt };

                await keyv.set(name.toString(), persona);

                await keyv.set('currentPersona', persona);

                currentPersona = persona as any;

                await sendMessage(
                    `Updating persona to ${name}.\nDescription: ${description}\nPrompt: ${prompt}`,
                    channelId
                );

                await interaction.reply('Updated persona!');
            }
        }

        if (interaction.commandName === 'get-persona') {
            await interaction.reply(
                `Name: ${currentPersona.name}\nDescription: ${currentPersona.description}\nPrompt: ${currentPersona.systemPrompt}`
            );
        }
    }
});
