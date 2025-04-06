import axios from 'axios';

const OLLAMA_API_URL = 'http://localhost:11434/summarize';

export const summarizeText = async (text) => {
    try {
        const response = await axios.post(OLLAMA_API_URL, { text });
        return response.data.summary;
    } catch (error) {
        console.error('Error summarizing text:', error);
        throw new Error('Failed to summarize text');
    }
};