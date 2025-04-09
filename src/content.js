const convertedContent = async (content) => {
    const converter = new showdown.Converter();
    const html = converter.makeHtml(content);
    return html;
}

statusInterval = null;

const injectSidebar = async () => {
    // Check if the sidebar already exists
    const existingSidebar = document.getElementById('ollama-sidebar');
    if (existingSidebar) {
        existingSidebar.remove();
    }

    // Create a sidebar element and inject html
    const sidebar = document.createElement('div');
    sidebar.id = 'ollama-sidebar';
    await fetch("chrome-extension://" + chrome.runtime.id + "/src/sidebar/sidebar.html")
        .then(response => response.text())
        .then(sidebarhtml => {
            sidebarhtml = sidebarhtml.replaceAll("${chrome.runtime.id}", chrome.runtime.id);
            sidebar.innerHTML = sidebarhtml;
        })
        .catch(error => {
            console.error('Error fetching sidebar HTML:', error);
        });
    document.body.appendChild(sidebar);
    
    // Create a style element and inject css
    const style = document.createElement('style');
    await fetch("chrome-extension://" + chrome.runtime.id + "/src/sidebar/sidebar.css")
        .then(response => response.text())
        .then(sidebarcss => {
            style.textContent = sidebarcss;
        })
        .catch(error => {
            console.error('Error fetching sidebar CSS:', error);
        });
    document.head.appendChild(style);

    //  Load the Google Fonts stylesheet for OPEN SANS
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Add event listener to the close button
    const closeButton = document.getElementById('close-sidebar');
    closeButton.addEventListener('click', () => {
        sidebar.remove(); // Remove the sidebar from the DOM
    });

    // Add event listener to the tab buttons
    const pageTabButton = document.getElementById('summary-toggle');
    const chatTabButton = document.getElementById('web-toggle');
    const pageTabContent = document.getElementById('summary-tab');
    const chatTabContent = document.getElementById('digest-tab');
    pageTabButton.addEventListener('click', () => {
        console.log('Page tab clicked');
        pageTabContent.style.display = 'block';
        chatTabContent.style.display = 'none';
    });
    chatTabButton.addEventListener('click', () => {
        console.log('Chat tab clicked');
        chatTabContent.style.display = 'block';
        pageTabContent.style.display = 'none';
    });

    // Add event listener to the summarize button (handle content selection)
    const summarizeButton = document.getElementById('summarize-button');
    summarizeButton.addEventListener('click', () => {
        const verboseSlider = document.getElementById('verbose-slider');
        const verboseLevel = verboseSlider.value;

        const inputSource = document.getElementById('input-source').value;
        console.log('Input source:', inputSource);

        if (inputSource === 'clipboard') {
            navigator.clipboard.readText().then((text) => {
                fetchSummary(text, verboseLevel);
            }).catch((error) => {
                console.error('Failed to read clipboard:', error);
            });
        } else if (inputSource === 'web-page') {
            console.log('Fetching content from web page...');
            fetchSummary(document.body.innerText || '', verboseLevel);
        }
    });
    
    // Add event listener to the chat-with-page form (handle chat input)
    const pageChatForm = document.getElementById('ollama-chat-form');
    pageChatForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the form from submitting
        const chatInput = document.getElementById('ollama-chat-input');
        const userInput = chatInput.value;
        const verboseSlider = document.getElementById('verbose-slider');
        const verboseLevel = verboseSlider.value;

        if (userInput) {
            pageContent = document.body.innerText || '';

            console.log("Length of page content: ", pageContent.length);
            fetchPageChat(pageContent, userInput, verboseLevel);
            chatInput.value = ''; // Clear the input field after sending
        }
    });

    // Add event listener to the web digest form (handle web digest input)
    const webDigestForm = document.getElementById('digest-form');
    webDigestForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the form from submitting
        const digestInput = document.getElementById('digest-input');
        const query = digestInput.value;

        if (query) {
            fetchWebDigest(query);
            digestInput.value = ''; // Clear the input field after sending
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
                "Content-Type": "application/json",
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

fetchWebDigest = async (query) => {
    console.log('fetchWebDigest called with query:', query);
    
    await fetch("https://api.duckduckgo.com/?q=" + query + "&format=json&redirected=1") // LOOK AT https://langsearch.com/overview
        .then(response => response.text())
        .then(data => {
            const jsonData = JSON.parse(data);
            console.log(jsonData);
            const outputDiv = document.getElementById('digest-output');
            outputDiv.innerText = data; // Clear previous output
        })

}