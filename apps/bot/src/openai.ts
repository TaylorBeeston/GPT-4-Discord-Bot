import { OpenAIApi, Configuration, ChatCompletionRequestMessage } from 'openai';

import { openAiToken } from './constants';
import { getCurrentPersona } from './persona';

export const addSystemPrompt = async (
    messages: ChatCompletionRequestMessage[]
): Promise<ChatCompletionRequestMessage[]> => {
    const currentPersona = getCurrentPersona();
    const { systemPrompt } = currentPersona ?? {};

    if (!systemPrompt) return messages;

    return [{ role: 'system', content: currentPersona.systemPrompt }, ...messages];
};

export const openAi = new OpenAIApi(new Configuration({ apiKey: openAiToken }));

export const callGPT4 = async (messages: ChatCompletionRequestMessage[]): Promise<string> => {
    const response = await openAi.createChatCompletion({ model: 'gpt-4-0613', messages });

    return response.data.choices[0]?.message?.content ?? '';
};

export const generateImage = async (prompt: string, hd = false): Promise<string> => {
    const response = await openai.createImage({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
    });

    return response.data.data[0].b64_json;
};
