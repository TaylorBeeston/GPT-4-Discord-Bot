import {
    ActionRowBuilder,
    Events,
    InteractionType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { DEFAULT_PERSONA, channelId } from './constants';

import { addSystemPrompt, callGPT4 } from './openai';
import { client, api, getMessageHistory, sendMessage } from './discord';
import { applicationId, guildId, discordToken } from './constants';
import { commands } from './commands';
import { keyv } from './storage';
import { getCurrentPersona, savePersona, setPersona } from './persona';
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
            const [nameOption, descriptionOption, promptOption, avatarOption] =
                interaction.options.data;
            const name = nameOption?.value;
            const description = descriptionOption?.value;
            const prompt = promptOption?.value;
            const avatar = avatarOption?.value;

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

            const [nameOption, descriptionOption, promptOption, avatarOption] =
                interaction.options.data;
            const name = nameOption?.value;
            const description = descriptionOption?.value;
            const prompt = promptOption?.value;
            const avatar = avatarOption?.value;

            const nameTest = interaction.options.get('name');
            const avatarTest = interaction.options.get('avatar');

            console.log({ name, description, prompt, avatar, nameTest, avatarTest });

            const persona = {
                ...currentPersona,
                ...(name ? { name } : {}),
                ...(description ? { description } : {}),
                ...(prompt ? { systemPrompt: prompt } : {}),
                ...(avatar ? { avatar } : {}),
            } as Persona;

            console.log({ persona });

            /* await savePersona(persona);

            await setPersona(persona); */

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

        if (interaction.commandName === 'update-persona') {
            const personas: Persona[] = JSON.parse((await keyv.get('personas')) ?? '[]');

            const row = await getPersonaPicker('Select a persona to update');

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
                    const persona = personas[value]!;

                    const modal = await getUpdatePersonaModal(persona);

                    await interaction.showModal(modal);

                    const modalResponse = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000,
                    });

                    if (!modalResponse.isFromMessage()) return;

                    const name = modalResponse.fields.getTextInputValue('name');
                    const description = modalResponse.fields.getTextInputValue('description');
                    const prompt = modalResponse.fields.getTextInputValue('prompt');

                    await Promise.all([
                        savePersona({
                            name,
                            description,
                            systemPrompt: prompt,
                            avatar: persona.avatar,
                        }),
                        interaction.editReply({ content: 'Updated persona!', components: [] }),
                    ]);
                }
            }
        }
    }
});
