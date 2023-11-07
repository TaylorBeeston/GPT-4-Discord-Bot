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
    {
        name: 'update-current-persona',
        description: "Update the Bot's persona",
        options: [
            {
                name: 'name',
                type: ApplicationCommandOptionType.String,
                description: 'The name of the persona',
                required: false,
            },
            {
                name: 'description',
                type: ApplicationCommandOptionType.String,
                description: 'Description for the persona',
                required: false,
            },
            {
                name: 'prompt',
                type: ApplicationCommandOptionType.String,
                description: 'Prompt for the persona',
                required: false,
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
    { name: 'delete-persona', description: 'Delete a persona' },
    {
        name: 'generate-image',
        description: 'Generate an image with DallE 3',

        options: [
            {
                name: 'prompt',
                type: ApplicationCommandOptionType.String,
                description: 'Prompt for the persona',
                required: true,
            },
            {
                name: 'hd',
                type: ApplicationCommandOptionType.Boolean,
                description: 'Create HD Image? (More expensive)',
                required: false,
            },
        ],
    },
];
