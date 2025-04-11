// converting markdown to html
const convertedContent = async (content) => {
    const converter = new showdown.Converter();
    const html = converter.makeHtml(content);
    return html;
}


// hold the ping setInterval to cancel on sidebar close
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
            sidebarcss = sidebarcss.replaceAll("${chrome.runtime.id}", chrome.runtime.id);
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
    const configTabButton = document.getElementById('config-toggle');
    const pageTabContent = document.getElementById('summary-tab');
    const configTabContent = document.getElementById('config-tab');
    pageTabButton.addEventListener('click', () => {
        console.log('Page tab clicked');
        pageTabContent.style.display = 'block';
        pageTabButton.style.backgroundColor = '#76b600'; 
        configTabContent.style.display = 'none';
        configTabButton.style.backgroundColor = '#218500';
    });
    configTabButton.addEventListener('click', () => {
        console.log('Config tab clicked');
        configTabContent.style.display = 'block';
        configTabButton.style.backgroundColor = '#76b600';
        pageTabContent.style.display = 'none';
        pageTabButton.style.backgroundColor = '#218500';
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

    const urlSaveButton = document.getElementById('save-url');
    const ollamaUrlInput = document.getElementById('ollama-url');
    // Set the default value of the input field
    ollamaUrlInput.value = await new Promise((resolve) => {
        chrome.storage.sync.get(['ollamaUrl'], (result) => {
            resolve(result.ollamaUrl || "http://localhost:11434");
        });
    });
    // Add event listener to the save button (handle Ollama URL)
    urlSaveButton.addEventListener('click', () => {
        const ollamaUrl = ollamaUrlInput.value;
        chrome.storage.sync.set({ ollamaUrl }, () => {
            console.log('Ollama URL saved:', ollamaUrl);
            alert('Ollama URL saved successfully!');
        });
    });

    const modelSaveButton = document.getElementById('save-model');
    const modelInput = document.getElementById('ollama-model');
    // Set the default value of the input field
    modelInput.value = await new Promise((resolve) => {
        chrome.storage.sync.get(['ollamaModel'], (result) => {
            resolve(result.ollamaModel || "llama3.2");
        });
    });
    // Add event listener to the save button (handle Ollama model)
    modelSaveButton.addEventListener('click', () => {
        const ollamaModel = modelInput.value;
        chrome.storage.sync.set({ ollamaModel }, () => {
            console.log('Ollama model saved:', ollamaModel);
            alert('Ollama model saved successfully!');
        });
    });

    // Add loop to check if the ollama server is running
    const ollamaStatus = document.getElementById('status-circle');  //make sure gives a negative response (might need a rollback)
    statusInterval = setInterval(async () => {

        const proxyFetch = async (url, options = {}) => {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        action: 'proxyRequest',
                        url,
                        method: options.method,
                        headers: options.headers,
                        body: options.body,
                    },
                    (response) => {
                        if (response.success) {
                            resolve(new Response(response.data));
                        } else {
                            reject(new Error(response.error));
                        }
                    }
                );
            });
        };
        // Resolve the Ollama URL from storage
        const ollamaUrl = await new Promise((resolve) => {
            chrome.storage.sync.get(['ollamaUrl'], (result) => {
                resolve(result.ollamaUrl || "http://localhost:11434");
            });
        });
        const response = await proxyFetch(ollamaUrl, { method: 'GET' });
        const responseText = await response.text();
        console.log(response);
        if (responseText.includes('Ollama is running')) {
            ollamaStatus.style.backgroundColor = '#00aa00'; // Green
            ollamaStatus.title = 'Ollama is running';
            // Delete the loading gif
            const loadingGif = document.getElementById('ollama-status-loading');
            if (loadingGif) {
                loadingGif.remove();
            }
        } else {
            ollamaStatus.style.backgroundColor = '#dd0000'; // Red
            ollamaStatus.title = 'Unable to connect to Ollama';
        }
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
                resolve(result.ollamaUrl || "http://localhost:11434");
            });
        });

        // Resolve the Ollama model from storage
        const ollamaModel = await new Promise((resolve) => {
            chrome.storage.sync.get(['ollamaModel'], (result) => {
                resolve(result.ollamaModel || "llama3.2");
            });
        });

        // Make the fetch request
        const response = await fetch(ollamaUrl + '/api/chat', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: ollamaModel,
                messages: [
                    {
                        role: 'system',
                        content: `You are an assistant that summarizes text from a web page. 

                        Provide concise and clear summaries and responses.
                        
                        Length Level:
                        
                            A level close to 0/100 should yield a brief digest.
                            
                            A level close to 100/100 should provide a more detailed summary.

                            The length level does not define the number of words directly in the summary, just the relative score of how long the summary is based on the web page content.
                        
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
                resolve(result.ollamaUrl || "http://localhost:11434");
            });
        });

        // Resolve the Ollama model from storage
        const ollamaModel = await new Promise((resolve) => {
            chrome.storage.sync.get(['ollamaModel'], (result) => {
                resolve(result.ollamaModel || "llama3.2");
            });
        });

        const response = await fetch(ollamaUrl + '/api/chat', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: ollamaModel,
                messages: [
                    {
                        role: 'system',
                        content: `You are an assistant that responds to user queries with information gathered from a web page.

                        Your goal is to answer the user's question using the content of the web page.

                        ONLY USE THE WEB PAGE CONTENT'S INFORMATION TO ANSWER THE USER'S QUESTION. DO NOT INFER OR MAKE UP ANYTHING.
                        
                        Length Level:
                        
                            A level close to 0/100 should yield a brief digest.
                            
                            A level close to 100/100 should provide a more detailed response.

                            The length level does not define the number of words directly in the summary, just the relative score of how long the summary is based on the web page content.
                        
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