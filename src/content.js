const sidebarHTML = `
    <div>
        <div class="sidebar-header">
            <button id="close-sidebar">X</button>
            <button id="info-button" onClick="window.open('https://github.com/chad-russell-git/chrome-ollama-extension/', '_blank');">i</button>
            <h2>Page Summarizer</h2>
        </div>
        <div class="buttons">
            <button id="summarize-button">Summarize</button>
            <button id="clipboard-button">From Clipboard</button>
        </div>
        <h3>Verbose Slider</h3>
        <input type="range" id="verbose-slider" min="0" max="100" value="50">
        <div id="summary-output"></div>
    </div>
`;

const sidebarCSS = `
    @font-face {
        font-family: 'HandelGothic';
        src: url("chrome-extension://${chrome.runtime.id}/src/fonts/Handel Gothic Regular.woff") format('woff');
    }

    #ollama-sidebar {
        background-color:rgb(0, 0, 0);
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
        background-color:rgb(21, 138, 0);
        position: absolute;
        left: 3px;
        top: 3px;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 10px;
        width: 20px;
        height: 20px;
        font-family: 'HandelGothic', sans-serif;
        font-weight: bold;
        border-radius: 50%;
        text-align: center;
    }

    #ollama-sidebar #info-button {
        background-color:rgb(21, 138, 0);
        position: absolute;
        right: 3px;
        top: 3px;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 10px;
        width: 20px;
        height: 20px;
        font-family: sans-serif;
        font-weight: bold;
        border-radius: 50%;
        text-align: center;
    }

    #ollama-sidebar .buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
    }

    #ollama-sidebar #summarize-button,#clipboard-button {
        background-color: #76b900;
        color: white;
        border: none;
        padding: 10px;
        margin: 5px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 5px;
        font-family: 'HandelGothic', sans-serif;
    }

    #ollama-sidebar h2 {
        color: #76b900;
        font-family: 'HandelGothic', sans-serif;
        font-size: 24px;
        margin-bottom: 10px;
        margin-top: 0px;
    }

    #ollama-sidebar h3 {
        color: #fff;
        font-family: 'HandelGothic', sans-serif;
        font-size: 18px;
        align: left;
        margin-top: 0px;
        margin-bottom: 0px;
        text-align: left;
        padding-top: 10px;
    }

    #ollama-sidebar #summary-output {
        background-color: #fff;
        border: 1px solid #ccc;
        padding: 10px;
        margin-top: 10px;
        min-height: 30vh;
        max-height: 30vh;
        overflow-y: auto;
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        text-align: left;
    }

    #ollama-sidebar #verbose-slider {
        width: 100%;
        accent-color: #76b900;
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
        //get the verbose level from the slider
        const verboseSlider = document.getElementById('verbose-slider');
        const verboseLevel = verboseSlider.value;
        fetchSummary(document.body.innerText || '', verboseLevel);
    });


    const clipboardButton = document.getElementById('clipboard-button');
    clipboardButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            console.log('Clipboard content:', text);

            // Get the verbose level from the slider
            const verboseSlider = document.getElementById('verbose-slider');
            const verboseLevel = verboseSlider.value;

            fetchSummary(text, verboseLevel);
        } catch (error) {
            console.error('Failed to read clipboard:', error);
        }
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

async function fetchSummary(content, verboseLevel) {
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
                        role: 'system',
                        content: 'You are a helpful assistant that summarizes text. You will be given a verboseness level from 0 to 100. 0 means a very short one sentence summary and 100 is a long, detailed, and formatted summary. Only respond with the summary.'
                    },
                    {
                        role: 'user',
                        content: 'summarize the following content with a verboseness level of ' + verboseLevel + "/100  -  " + content
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