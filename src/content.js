const sidebarHTML = `
    <div>
        <div class="sidebar-header">
            <button id="close-sidebar">X</button>
            <h2>Page Summarizer</h2>
        </div>
        <button id="summarize-button">Summarize</button>
        <div id="summary-output"></div>
    </div>
`;

const sidebarCSS = `
    @font-face {
        font-family: 'HandelGothic';
        src: url("chrome-extension://${chrome.runtime.id}/src/fonts/Handel Gothic Regular.woff") format('woff');
    }

    #ollama-sidebar {
        background-color: #f4f4f4;
        padding: 10px;
        border-bottom: 1px solid #ccc;
        text-align: center;
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100%;
        z-index: 9999;
        box-shadow: -2px 0 5px rgba(0,0,0,0.5);
    }

    #ollama-sidebar #close-sidebar {
        background-color: #ff4d4d;
        position: absolute;
        left: 3px;
        top: 3px;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 16px;
    }

    #ollama-sidebar #summarize-button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 10px;
    }

    #ollama-sidebar h2 {
        font-family: 'HandelGothic', sans-serif;
        font-size: 24px;
        margin-bottom: 10px;
    }

    #ollama-sidebar #summary-output {
        background-color: #fff;
        border: 1px solid #ccc;
        padding: 10px;
        margin-top: 10px;
        max-height: 300px;
        overflow-y: auto;
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        text-align: left;
    }
`;

const injectSidebar = () => {
    // Check if the sidebar already exists
    const existingSidebar = document.getElementById('ollama-sidebar');
    if (existingSidebar) {
        existingSidebar.remove(); // Remove the existing sidebar
    }

    // Create a sidebar element
    const sidebar = document.createElement('div');
    sidebar.id = 'ollama-sidebar';
    sidebar.innerHTML = sidebarHTML;
    document.body.appendChild(sidebar);
    
    // Create a style element and append the CSS to it
    const style = document.createElement('style');
    style.textContent = sidebarCSS;
    document.head.appendChild(style);

    // Add event listener to the close button
    const closeButton = document.getElementById('close-sidebar');
    closeButton.addEventListener('click', () => {
        sidebar.remove(); // Remove the sidebar from the DOM
    });

    // Add event listener to the summarize button
    const summarizeButton = document.getElementById('summarize-button');
    summarizeButton.addEventListener('click', () => {
        fetchSummary(document.body.innerText || '')
    });
}

const main = () => {
    // injectSidebar(); // Inject the sidebar into the page
};

// Ensure the DOM is fully loaded before running the main function
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    main();
});

// toggle the sidebar on message from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleSidebar') {
        const sidebar = document.getElementById('ollama-sidebar');
        if (sidebar) {
            sidebar.remove(); // Remove the sidebar if it already exists
        } else {
            injectSidebar(); // Inject the sidebar if it doesn't exist
        }
    }
});

//listener for activating extension
console.log('Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in content script:', request);

    if (request.action === 'getContent') {
        try {
            const content = document.body.innerText || '';
            console.log('Extracted content:', content);

            if (!content) {
                console.warn('No content extracted from the page.');
            }

            sendResponse({ content }); // Send the response
        } catch (error) {
            console.error('Error extracting content:', error);
            sendResponse({ error: 'Failed to extract content' });
        }
    }

    return true; // Indicate that the response will be sent asynchronously
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