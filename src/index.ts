import express, { json } from "express";
import axios from "axios";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { OpenAIApi } from "openai";

const discordToken = process.env.DISCORD_TOKEN;
const applicationId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const openAiToken = process.env.OPENAI_API_TOKEN;

if (!discordToken) throw new Error("Discord Token not set!");
if (!applicationId) throw new Error("Application ID not set!");
if (!guildId) throw new Error("Guild ID not set!");
if (!openAiToken) throw new Error("OpenAI Token not set!");

const openAi = new OpenAIApi({ accessToken: openAiToken });

const commands = [
    {
        name: "chat",
        description: "Chat with GPT-4!",
        options: [
            {
                name: "message",
                type: "STRING",
                description: "The message you want to send to GPT-4",
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: "9" }).setToken(discordToken);

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
    const response = await axios.post(
        "https://api.openai.com/v1/engines/gpt-4/completions",
        {
            prompt: message,
            max_tokens: 60,
        },
        {
            headers: {
                Authorization: `Bearer ${openAiToken}`,
            },
        }
    );

    return response.data.choices[0].text;
}

// Set up the Express server for handling interactions
const app = express();

// body-parser middleware is used to parse the request body
app.use(json());

app.post("/interactions", async (req, res) => {
    if (req.body.type === 1) {
        res.json({ type: 1 });
    } else if (req.body.type === 2) {
        if (req.body.data.name === "chat") {
            const message = req.body.data.options[0].value;
            const gpt4Response = await callGPT4(message);
            res.json({
                type: 4,
                data: {
                    content: gpt4Response,
                },
            });
        }
    }
});
