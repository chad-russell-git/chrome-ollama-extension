// import showdown from './lib/showdown-2.1.0/dist/showdown.min.js'

const sidebarHTML = `
    <div>
        <div class="sidebar-header">
            <button id="close-sidebar">\></button>
            <button id="info-button" onClick="window.open('https://github.com/chad-russell-git/chrome-ollama-extension/', '_blank');">i</button>
            <h2>Page Summarizer</h2>
        </div>
        <div class="settings">
            <select id="input-source">
                <option value="web-page">From Web Page</option>
                <option value="clipboard">From Clipboard</option>
            </select>
            <div class="slider-container"> 
                <h3>Response Length</h3>
                <input type="range" id="verbose-slider" min="0" max="100" value="50">
            </div>
        </div>
        <div class="actions">
            <button id="summarize-button">Summarize</button>
            <div id="status-circle" class="ollama-status-div">
                <img id="ollama-status" src="chrome-extension://${chrome.runtime.id}/src/img/ollama.png" alt="Ollama Logo" style="width: 20px; height: 20px;">
                <img id="ollama-status-loading" src="chrome-extension://${chrome.runtime.id}/src/img/cloud.gif" alt="Loading GIF">   
            </div>
        </div>
        <div id="summary-output"></div>

        <form id="ollama-chat-form" class="page-chat">
            <input type="text" id="ollama-chat-input" placeholder="Chat with the page..." />
            <button type="submit" id="ollama-chat-submit">Send</button>
        </form>

    </div>
`;

const sidebarCSS = `
    #ollama-sidebar {
        background-color:rgb(0, 0, 0);
        background-image: linear-gradient(to bottom, rgb(0, 0, 0), rgb(46, 46, 46));
        padding: 10px;
        border-bottom: 1px solid #ccc;
        text-align: center;
        position: fixed;
        top: 0;
        right: 0;
        width: 30%;
        min-width: 300px;
        max-width: 600px;
        height: 100%;
        z-index: 9999;
        box-shadow: -2px 0 5px rgba(0,0,0,0.5);
    }

    #ollama-sidebar .page-chat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
    }

    #ollama-sidebar .page-chat input {
        width: 80%;
        padding: 5px;
        border: 1px solid #ccc;
        font-size: 14px;
        font-family: 'Open Sans', sans-serif;
    }

    #ollama-sidebar .page-chat button {
        background-color: #76b900;
        width: 20%;
        color: black;
        border: none;
        padding: 6px 10px;
        padding-bottom: 5px;
        cursor: pointer;
        font-size: 14px;
        font-family: 'Open Sans', sans-serif;
        font-weight: bold;
    }

    #ollama-sidebar #close-sidebar {
        background-color: rgba(0,0,0,0);
        position: absolute;
        left: 3px;
        top: 3px;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 15px;
        font-weight: bold;
        width: 20px;
        height: 20px;
        font-family: 'Open Sans', sans-serif;
        font-weight: bold;
        border-radius: 5px;
        text-align: center;
    }

    #ollama-sidebar #close-sidebar img {
        transform: translate(-5px, 0px);
    }

    
    #ollama-sidebar #info-button {
        background-color:rgb(0, 0, 0);
        color: #76b900;
        border: 1px solid #76b900 !important;
        position: absolute;
        right: 5px;
        top: 5px;
        border: none;
        cursor: pointer;
        font-size: 9px;
        font-weight: bold;
        width: 16px;
        height: 16px;
        font-family: "Open Sans", sans-serif;
        font-weight: bold;
        border-radius: 50%;
        text-align: center;
    }
    
    #ollama-sidebar .settings {
        width: 100%;
        display: inline-flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0;
    }
        
    #ollama-sidebar .settings * {
        width: 100%;
        align-items: center;
        margin: 0px 5px;
        margin-top: -10px;
    }

    #ollama-sidebar select {
        background-color: #76b900;
        color: black;
        border: none;
        margin: 5px;
        cursor: pointer;
        padding: 5px 0px;
        font-size: 12px;
        font-family: 'Open Sans', sans-serif;
        width: 30%;
    }

    #ollama-sidebar #verbose-slider {
        width: 100%;
        accent-color: #76b900;
    }

    #ollama-sidebar .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;

    }

    #ollama-sidebar .ollama-status-div {
        background-color: #aaa;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        margin-right: 10px;
    }

    #ollama-sidebar .actions #ollama-status {
        transition: background-color 0.3s ease;
        transform: translate(0px, 3px);
    }

    #ollama-sidebar .actions #ollama-status-loading {
        display: block;
        width: 20px;
        height: 20px;
        position: absolute;
        transform: translate(20px, -34px);
    }
        
    #ollama-sidebar #summarize-button {
        background-color: #76b900;
        color: black;
        font-weight: bold;
        border: none;
        padding: 4px 40px;
        width: calc(50% - 10px);
        margin: 5px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 5px;
        font-family: 'Open Sans', sans-serif;
        align-self: left;
    }

    #ollama-sidebar h2 {
        color: #fff;
        font-family: 'Open Sans', sans-serif;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 10px;
        margin-top: -5px;
    }

    #ollama-sidebar h3 {
        color: #fff;
        font-family: 'Open Sans', sans-serif;
        font-size: 12px;
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
        min-height: 60vh;
        max-height: 60vh;
        overflow-y: auto;
        font-family: 'Arial', sans-serif;
        font-size: 11px;
        text-align: left;
        color: black;
    }

    #ollama-sidebar #summary-output code {
        padding: 2px 5px;
        border-radius: 3px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        color: #333;
        text-shadow: none;
    }

    #ollama-sidebar #summary-output h1 {
        ont-family: 'Arial', sans-serif;
        font-size: 24px;
        font-weight: bold;
        margin: 10px 0;
        color: #000;
    }

    #ollama-sidebar #summary-output h2 {
        font-family: 'Arial', sans-serif;
        font-size: 20px;
        font-weight: bold;
        margin: 8px 0;
        color: #000;
    }

    #ollama-sidebar #summary-output h3 {
        font-family: 'Arial', sans-serif;
        font-size: 18px;
        font-weight: bold;
        margin: 6px 0;
        color: #000;
    }

    #ollama-sidebar #summary-output h4 {
        font-family: 'Arial', sans-serif;
        font-size: 16px;
        font-weight: bold;
        margin: 4px 0;
        color: #000;
    }

    #ollama-sidebar #summary-output p {
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        margin: 8px 0;
        color: #000;
    }

    #ollama-sidebar #summary-output ul {
        font-family: 'Arial', sans-serif;
        margin: 10px 0;
        padding-left: 20px;
        list-style-type: disc;
    }

    #ollama-sidebar #summary-output ol {
        font-family: 'Arial', sans-serif;
        margin: 10px 0;
        padding-left: 20px;
        list-style-type: decimal;
    }

    #ollama-sidebar #summary-output li {
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        margin: 4px 0;
        color: #000;
    }
`;

const convertedContent = async (content) => {
    const converter = new showdown.Converter();
    const html = converter.makeHtml(content);
    return html;
}

statusInterval = null;

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

    //  Load the Google Fonts stylesheet
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

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

        // get the input source from the select element
        const inputSource = document.getElementById('input-source').value;
        console.log('Input source:', inputSource); // Debug log
        if (inputSource === 'clipboard') {
            navigator.clipboard.readText().then((text) => {
                fetchSummary(text, verboseLevel);
            }).catch((error) => {
                console.error('Failed to read clipboard:', error); // Debug log
            });
        } else if (inputSource === 'web-page') {
            // If the input source is the web page, fetch the content from the body
            console.log('Fetching content from web page...'); // Debug log
            fetchSummary(document.body.innerText || '', verboseLevel);
        }
    });

    const pageChatForm = document.getElementById('ollama-chat-form');
    pageChatForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the form from submitting
        const chatInput = document.getElementById('ollama-chat-input');
        const userInput = chatInput.value;
        const verboseSlider = document.getElementById('verbose-slider');
        const verboseLevel = verboseSlider.value;

        if (userInput) {
            pageContent = document.body.innerText || '';

            console.log("Length of page content: ", pageContent.length); // Debug log
            fetchPageChat(pageContent, userInput, verboseLevel);
            chatInput.value = ''; // Clear the input field after sending
        }
    });

    // Add loop to check if the ollama server is running
    const ollamaStatus = document.getElementById('status-circle');
    statusInterval = setInterval(async () => {
        try {
            const response = await fetch('http://localhost:11434/', {"method": "GET"});
            if (response.ok) {
                ollamaStatus.style.backgroundColor ='#00aa00'; // Green
                //hover text
                ollamaStatus.title = 'Ollama is running';
                // Delete the loading gif
                const loadingGif = document.getElementById('ollama-status-loading');
                if (loadingGif) {
                    loadingGif.remove();
                }
            } else {
                ollamaStatus.style.backgroundColor ='#ffaa00'; // Yellow
                //hover text
                ollamaStatus.title = 'Ollama is not running';
            }
        } catch (error) {
            ollamaStatus.style.backgroundColor = '#ff0000'; // Red
            //hover text
            ollamaStatus.title = 'Ollama is not running';        }
    }, 2000); // Check every 2 seconds
}

// toggle the sidebar on message from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleSidebar') {
        const sidebar = document.getElementById('ollama-sidebar');
        if (sidebar) {
            sidebar.remove(); // Remove the sidebar if it already exists
            clearInterval(statusInterval); // Clear the status interval
        } else {
            injectSidebar(); // Inject the sidebar if it doesn't exist
        }
    }
});

async function fetchSummary(content, verboseLevel) {
    console.log('fetchSummary called with web content.'); // Debug log
    console.log('fetchSummary called with verboseLevel: ', verboseLevel); // Debug log
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
                        content: `You are an assistant that summarizes text from a web page. 

                        Provide concise and clear summaries and responses.
                        
                        Length Level:
                        
                            A level close to 0/100 should yield a brief digest.
                            
                            A level close to 100/100 should provide a more detailed summary.
                        
                            The default length is 50/100. So anything smaller than 50 should be a shorter summary, and anything larger than 50 should be a longer summary.
                            (Note: Do not mention or refer to the length level in the response.)
                        
                        Structure the summary to be easily digestible, using bullet points or lists when necessary.

                        Respond using markdown formatting for better readability.
                            Do no use any header smaller than ##.
                            Do not use tables.
                        
                        For more detailed summaries, break up information into clear sections for better readability.
                        
                        Ensure the summary is in the same language as the input text.`,
                    },
                    {
                        role: 'user',
                        content: 'summarize the following content with a length level of ' + verboseLevel + "/100  -  " + content
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

        let message = "";

        let done = false;
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                
                // Process each line of the chunk
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsedLine = JSON.parse(line);
                            if (parsedLine.message && parsedLine.message.content) {
                                message += parsedLine.message.content; // Append streamed text
                                
                                const convertedMessage = await convertedContent(message); // Convert to HTML
                                outputElement.innerHTML = convertedMessage; // Append streamed text
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

async function fetchPageChat(content, userInput, verboseLevel) {
    console.log('fetchPageChat called with web content.'); // Debug log
    console.log('fetchPageChat called with verboseLevel: ', verboseLevel); // Debug log
    console.log('fetchPageChat called with userInput: ', userInput); // Debug log
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
                        content: `You are an assistant that responds to user queries with information gathered from a web page.

                        Your goal is to answer the user's question using the content of the web page.

                        ONLY USE THE WEB PAGE CONTENT'S INFORMATION TO ANSWER THE USER'S QUESTION. DO NOT INFER OR MAKE UP ANYTHING.
                        
                        Length Level:
                        
                            A level close to 0/100 should yield a brief digest.
                            
                            A level close to 100/100 should provide a more detailed response.
                        
                            The default length is 50/100. So anything smaller than 50 should be a shorter summary, and anything larger than 50 should be a longer summary.
                            (Note: Do not mention or refer to the length level in the response.)
                        
                        Structure the response to be easily digestible, using bullet points or lists when necessary.

                        Respond using markdown formatting for better readability.
                            Do not use any header smaller than ##.
                            Do not use tables.
                        
                        For more detailed responses, break up information into clear sections for better readability.
                        
                        Ensure the response is in the same language as the input text.`
                    },
                    {
                        role: 'user',
                        content: 'Here is the content of the web page: ' + content
                    },
                    {
                        role: 'assistant',
                        content: 'Thank you for the content. I will use it to answer the user query.'
                    },
                    {
                        role: "user",
                        content: "Regarding the information from the webpage: " + userInput
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

        let message = "";

        let done = false;
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                
                // Process each line of the chunk
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsedLine = JSON.parse(line);
                            if (parsedLine.message && parsedLine.message.content) {
                                message += parsedLine.message.content; // Append streamed text
                                
                                const convertedMessage = await convertedContent(message); // Convert to HTML
                                outputElement.innerHTML = convertedMessage; // Append streamed text
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