import express, { json } from "express";
import {
    InteractionResponseType,
    InteractionType,
    verifyKeyMiddleware,
} from "discord-interactions";
import { REST } from "@discordjs/rest";
import {
    Routes,
    APIApplicationCommandOption,
    ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { OpenAIApi, Configuration } from "openai";

const discordToken = process.env.DISCORD_TOKEN;
const discordKey = process.env.DISCORD_APPLICATION_KEY;
const applicationId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const channelId = process.env.CHANNEL_ID;
const openAiToken = process.env.OPENAI_API_TOKEN;

if (!discordToken) throw new Error("Discord Token not set!");
if (!discordKey) throw new Error("Discord Application Key not set!");
if (!applicationId) throw new Error("Application ID not set!");
if (!guildId) throw new Error("Guild ID not set!");
if (!channelId) throw new Error("Channel ID not set!");
if (!openAiToken) throw new Error("OpenAI Token not set!");

const openAi = new OpenAIApi(new Configuration({ apiKey: openAiToken }));

const commands: APIApplicationCommandOption[] = [
    {
        name: "chat",
        description: "You tryna chat with a bot?",
        options: [
            {
                name: "message",
                type: ApplicationCommandOptionType.String,
                description: "The message you want to send to GPT-4",
                required: true,
            },
            {
                name: "private",
                type: ApplicationCommandOptionType.Boolean,
                description: "Do you want this to be private? (defaults to false)",
                required: false,
            },
        ],
    },
];

const rest = new REST({ version: "10" }).setToken(discordToken);

(async () => {
    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
            body: commands,
        });

        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }
})();

async function callGPT4(message: string): Promise<string> {
    const response = await openAi.createChatCompletion({
        model: "gpt-4",
        messages: [{ role: "user", content: message }],
    });

    return response.data.choices[0]?.message?.content ?? "";
}

// Set up the Express server for handling interactions
const app = express();

app.use(verifyKeyMiddleware(discordKey));

app.post("/interactions", async (req, res) => {
    const { type, data, member } = req.body;

    console.log("Got a request!", { type, data, member: JSON.stringify(member) });

    if (type === InteractionType.PING) {
        return res.json({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        if (data.name === "chat") {
            const message = req.body.data.options[0].value;
            const isPrivate = req.body.data.options[1]?.value;

            console.log({ message });

            const gpt4Response = await callGPT4(message);

            console.log({ gpt4Response });

            if (!isPrivate) {
                const content = `${member?.user?.username} asked ${message}\n\n${gpt4Response}`;

                if (content.length > 2000) {
                    const chunks = Array.from(content.match(/[\s\S]{1,1975}/g) ?? []);

                    for (let chunkIndex in chunks) {
                        const chunk = chunks[chunkIndex];

                        await rest.post(Routes.channelMessages(channelId), {
                            body: {
                                content: `${chunk}\n(${chunkIndex + 1} / ${chunks.length})`,
                            },
                        });
                    }
                } else {
                    await rest.post(Routes.channelMessages(channelId), {
                        body: { content },
                    });
                }
            }

            return res.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: gpt4Response },
            });
        }
    }
});

export default app;
