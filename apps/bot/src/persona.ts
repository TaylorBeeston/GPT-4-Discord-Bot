import { api, client, sendMessage } from './discord';
import { keyv } from './storage';
import { Persona } from './types';

import { DEFAULT_PERSONA, channelId } from './constants';

export let currentPersona = DEFAULT_PERSONA;

export const setPersona = async (persona: Persona) => {
    await keyv.set('currentPersona', persona);
    currentPersona = persona;

    try {
        if (client.user?.username !== `${persona.name} [BOT]`) {
            await sendMessage(
                `Updating persona to ${persona.name}.\nDescription: ${persona.description}\nPrompt: ${persona.systemPrompt}`,
                channelId
            );

            await client.user?.setUsername(`${persona.name} [BOT]`);

            console.log('Successfully changed personas to', persona);
        }
    } catch (error: any) {
        console.error('Could not set username', { error });
    }

    try {
        if (persona.avatar && persona.avatar !== client.user?.avatarURL()) {
            await client.user?.setAvatar(persona.avatar);
        }
    } catch (error: any) {
        console.error('Could not set avatar', { error });
    }
};

export const savePersona = async (persona: Persona) => {
    const existing: Persona[] = JSON.parse((await keyv.get('personas')) ?? '[]');

    const existingIndex = existing.findIndex(p => p.name === persona.name);

    if (existingIndex > -1) existing[existingIndex] = persona;
    else existing.push(persona);

    await keyv.set('personas', JSON.stringify(existing));
};

export const getCurrentPersona = () => currentPersona;
