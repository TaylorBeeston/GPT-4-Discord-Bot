import {
    ActionRowBuilder,
    Events,
    InteractionType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { DEFAULT_PERSONA, channelId, dbKey } from './constants';

import { addSystemPrompt, callGPT4, generateImage } from './openai';
import { client, api, getMessageHistory, sendMessage } from './discord';
import { applicationId, guildId, discordToken } from './constants';
import { commands } from './commands';
import { keyv } from './storage';
import { deletePersona, getCurrentPersona, savePersona, setPersona } from './persona';
import { Persona } from './types';
import { getPersonaPicker, getUpdatePersonaModal } from './interactions';

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

        keyv.get(dbKey).then(async persona => {
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
            const nameOption = interaction.options.get('name');
            const descriptionOption = interaction.options.get('description');
            const promptOption = interaction.options.get('prompt');
            const avatarOption = interaction.options.get('avatar');

            const name = nameOption?.value;
            const description = descriptionOption?.value;
            const prompt = promptOption?.value;
            const avatar = avatarOption?.attachment?.url;

            if (name && description && prompt) {
                const persona = {
                    name,
                    description,
                    systemPrompt: prompt || '',
                    avatar,
                } as Persona;

                await savePersona(persona);

                await setPersona(persona);

                await interaction.reply('Updated persona!');
            }
        }

        if (interaction.commandName === 'update-current-persona') {
            const currentPersona = getCurrentPersona();

            const nameOption = interaction.options.get('name');
            const descriptionOption = interaction.options.get('description');
            const promptOption = interaction.options.get('prompt');
            const avatarOption = interaction.options.get('avatar');

            const name = nameOption?.value;
            const description = descriptionOption?.value;
            const prompt = promptOption?.value;
            const avatar = avatarOption?.attachment?.url;

            const persona = {
                ...currentPersona,
                ...(name ? { name } : {}),
                ...(description ? { description } : {}),
                ...(prompt ? { systemPrompt: prompt } : {}),
                ...(avatar ? { avatar } : {}),
            } as Persona;

            console.log({ persona });

            await savePersona(persona);

            await setPersona(persona);

            await interaction.reply('Updated persona!');
        }

        if (interaction.commandName === 'get-persona') {
            const currentPersona = getCurrentPersona();
            await interaction.reply(
                `Name: ${currentPersona.name}\nDescription: ${currentPersona.description}\nPrompt: ${currentPersona.systemPrompt}`
            );
        }

        if (interaction.commandName === 'list-personas') {
            const personas = (await keyv.get('personas')) ?? '[]';
            console.log({ personas });
            await interaction.reply(personas);
        }

        if (interaction.commandName === 'select-persona') {
            const personas: Persona[] = JSON.parse((await keyv.get('personas')) ?? '[]');

            const row = await getPersonaPicker('Pick a persona to use');

            const response = await interaction.reply({
                content: 'Select a persona',
                components: [row],
                ephemeral: true,
            });

            const selectionResponse = await response.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 60000,
            });

            if (selectionResponse.isStringSelectMenu()) {
                const { values } = selectionResponse;
                const value = Number(values[0]);

                console.log({ values });

                if (!Number.isNaN(value) && personas[value]) {
                    await Promise.all([
                        setPersona(personas[value]!),
                        interaction.editReply({ content: 'Updated persona!', components: [] }),
                    ]);
                }
            }
        }

        if (interaction.commandName === 'delete-persona') {
            const personas: Persona[] = JSON.parse((await keyv.get('personas')) ?? '[]');

            const row = await getPersonaPicker('Pick a persona to use');

            const response = await interaction.reply({
                content: 'Select a persona',
                components: [row],
                ephemeral: true,
            });

            const selectionResponse = await response.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 60000,
            });

            if (selectionResponse.isStringSelectMenu()) {
                const { values } = selectionResponse;
                const value = Number(values[0]);

                console.log({ values });

                if (!Number.isNaN(value) && personas[value]) {
                    await Promise.all([
                        deletePersona(personas[value]!.name),
                        interaction.editReply({ content: 'Deleted persona!', components: [] }),
                    ]);
                }
            }
        }

        if (interaction.commandName === 'generate-image') {
            const promptOption = interaction.options.get('prompt');
            const hdOption = interaction.options.get('hd');

            const prompt = promptOption?.value;
            const hd = hdOption?.value;

            await interaction.reply('Generating...');

            const image = await generateImage(prompt, hd);

            const messageObject = await api.channels.createMessage(channelId, {
                content: '',
                files: [{ name: prompt + '.png', data: image }],
            });
        }
    }
});
