import Anthropic from '@anthropic-ai/sdk';

import { anthropicToken } from './constants';
import { getCurrentPersona } from './persona';

export const addSystemPrompt = async (
    messages: Anthropic.Messages.MessageParam[]
): Promise<Anthropic.Messages.MessageParam[]> => {
    const currentPersona = getCurrentPersona();
    const { systemPrompt } = currentPersona ?? {};

    if (!systemPrompt) return messages;

    return [{ role: 'system', content: currentPersona.systemPrompt }, ...messages];
};

export const anthropic = new Anthropic({ apiKey: anthropicToken });

export const callClaude = async (messages: Anthropic.Messages.MessageParam[]): Promise<string> => {
    const response = await anthropic.messages.create({
        max_tokens: 1024,
        model: 'claude-3-opus-20240229',
        messages,
    });

    return response.content.map(response => response.text).join(' ');
};

export const generateImage = async (prompt: string, hd = false): Promise<string> => {
    const response = await anthropic.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
        quality: hd ? 'hd' : 'standard',
    });

    return response.data[0]?.b64_json ?? '';
};
