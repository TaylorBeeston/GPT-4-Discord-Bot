import OpenAI from 'openai';

import { openAiToken } from './constants';
import { getCurrentPersona } from './persona';

export const addSystemPrompt = async (
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> => {
    const currentPersona = getCurrentPersona();
    const { systemPrompt } = currentPersona ?? {};

    if (!systemPrompt) return messages;

    return [{ role: 'system', content: currentPersona.systemPrompt }, ...messages];
};

export const openAi = new OpenAI({ apiKey: openAiToken });

export const callGPT4 = async (
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> => {
    const response = await openAi.chat.completions.create({ model: 'gpt-4-0613', messages });

    return response.choices[0]?.message?.content ?? '';
};

export const generateImage = async (prompt: string, hd = false): Promise<string> => {
    const response = await openAi.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
        quality: hd ? 'hd' : 'standard',
    });

    return response.data[0]?.b64_json ?? '';
};
