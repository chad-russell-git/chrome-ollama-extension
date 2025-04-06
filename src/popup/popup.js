document.addEventListener('DOMContentLoaded', () => {
    const summarizeButton = document.getElementById('summarize-button');

    if (!summarizeButton) {
        console.error('summarizeButton is not defined. Ensure the button exists in popup.html and the script is loaded after the DOM.');
        return;
    }

    const summaryOutput = document.getElementById('summary-output');
    const ollamaUrlInput = document.getElementById('ollama-url');
    const saveUrlButton = document.getElementById('save-url-button');

    // Load the saved URL when the popup is opened
    chrome.storage.sync.get(['ollamaUrl'], (result) => {
        ollamaUrlInput.value = result.ollamaUrl || 'http://localhost:11434/api/chat';
    });

    // Save the URL when the user clicks the save button
    saveUrlButton.addEventListener('click', () => {
        const ollamaUrl = ollamaUrlInput.value;
        chrome.storage.sync.set({ ollamaUrl }, () => {
            summaryOutput.textContent = 'Ollama URL saved!';
        });
    });

    // Handle the "Summarize" button click
    summarizeButton.addEventListener('click', () => {
        console.log('Summarize button clicked'); // Debug log
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('Sending message to content script');
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getContent' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error communicating with content script:', chrome.runtime.lastError.message);
                    summaryOutput.textContent = 'Error: ' + chrome.runtime.lastError.message;
                    return;
                }

                console.log('Response from content script:', response);
                if (response && response.content) {
                    console.log('Content retrieved from content script:', response.content);
                    fetchSummary(response.content); // Pass the content to the fetchSummary function
                } else {
                    console.error('Failed to retrieve content from content script.');
                    summaryOutput.textContent = 'Failed to retrieve content.';
                }
            });
        });
    });

    async function fetchSummary(content) {
        console.log('fetchSummary called with content:', content); // Debug log
        try {
            // Resolve the Ollama URL from storage
            const ollamaUrl = await new Promise((resolve) => {
                chrome.storage.sync.get(['ollamaUrl'], (result) => {
                    resolve(result.ollamaUrl || 'http://localhost:11434/api/chat');
                });
            });

            // Make the fetch request
            const response = await fetch(ollamaUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: 'llama3.2',
                    messages: [
                        {
                            role: 'user',
                            content: 'summarize the following content - ' + content
                        }
                    ]
                })
            });

            console.log('Response from fetch:', response); // Debug log
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Read the response as a stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            const outputElement = document.getElementById('summary-output');
            outputElement.innerText = ''; // Clear previous output

            let done = false;
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    console.log('Chunk received:', chunk);

                    // Process each line of the chunk
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const parsedLine = JSON.parse(line);
                                if (parsedLine.message && parsedLine.message.content) {
                                    outputElement.innerText += parsedLine.message.content; // Append streamed text
                                }
                            } catch (error) {
                                console.warn('Failed to parse line:', line, error);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in fetchSummary:', error.message);
            summaryOutput.textContent = 'Error: ' + error.message;
        }
    }
});

console.log('Content script loaded');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in content script:', request);
    if (request.action === 'getContent') {
        const content = document.body.innerText || '';
        console.log('Extracted content:', content);
        sendResponse({ content }); // Send the response
    }
    return true; // Indicate that the response will be sent asynchronously
});