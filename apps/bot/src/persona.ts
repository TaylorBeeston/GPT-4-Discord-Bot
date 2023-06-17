import { client } from './discord';
import { keyv } from './storage';
import { Persona } from './types';

export const setPersona = async (persona: Persona) => {
    await keyv.set('currentPersona', persona);
    await client.user?.setUsername(persona.name);

    console.log('Successfully changed personas to', persona);
};
