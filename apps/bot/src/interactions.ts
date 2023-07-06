import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';

import { keyv } from './storage';
import { Persona } from './types';

export const getTextInput = ({
    id,
    label,
    style = TextInputStyle.Short,
    value = '',
    required = false,
}: {
    id: string;
    label: string;
    style?: TextInputStyle;
    value?: string;
    required?: boolean;
}) => {
    const input = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
        .setRequired(required)
        .setValue(value);

    return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
};

export const getPersonaPicker = async (
    message: string
): Promise<ActionRowBuilder<StringSelectMenuBuilder>> => {
    const personas: Persona[] = JSON.parse((await keyv.get('personas')) ?? '[]');

    const options = personas.map((persona, index) => {
        return new StringSelectMenuOptionBuilder()
            .setLabel(persona.name)
            .setDescription(persona.description ?? 'No description set')
            .setValue(index.toString());
    });

    const select = new StringSelectMenuBuilder()
        .setCustomId('personas')
        .setPlaceholder(message)
        .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
};
