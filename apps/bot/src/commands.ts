import {
    RESTPutAPIApplicationCommandsJSONBody,
    ApplicationCommandOptionType,
} from '@discordjs/core';

export const commands: RESTPutAPIApplicationCommandsJSONBody = [
    {
        name: 'set-persona',
        description: "Set the Bot's persona",
        options: [
            {
                name: 'name',
                type: ApplicationCommandOptionType.String,
                description: 'The name of the persona',
                required: true,
            },
            {
                name: 'description',
                type: ApplicationCommandOptionType.String,
                description: 'Description for the persona',
                required: true,
            },
            {
                name: 'prompt',
                type: ApplicationCommandOptionType.String,
                description: 'Prompt for the persona',
                required: true,
            },
            {
                name: 'avatar',
                type: ApplicationCommandOptionType.Attachment,
                description: 'Avatar for the persona',
                required: false,
            },
        ],
    },
    { name: 'get-persona', description: "Get the Bot's persona" },
    { name: 'list-personas', description: 'List saved personas' },
    { name: 'select-persona', description: 'Select a persona' },
    { name: 'update-persona', description: 'Update a persona' },
];
