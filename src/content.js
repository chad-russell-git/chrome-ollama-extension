// const extractTextFromPage = () => {
//     const bodyText = document.body.innerText;
//     console.log('Extracted page text:', bodyText); // Log the extracted text
//     return bodyText;
// };

// const sendTextToBackground = (text) => {
//     console.log('Sending text to background script:', text); // Log the text being sent
//     chrome.runtime.sendMessage({ action: 'summarize', text: text }, (response) => {
//         if (response && response.summary) {
//             console.log('Summary received from background script:', response.summary); // Log the summary received
//             // You can display the summary in a way you prefer
//         } else {
//             console.log('No summary received from background script.'); // Log if no summary is received
//         }
//     });
// };

const injectSidebar = () => {
    // Create a sidebar element
    const sidebar = document.createElement('div');
    sidebar.id = 'ollama-sidebar';
    sidebar.style.position = 'fixed';
    sidebar.style.top = '0';
    sidebar.style.right = '0';
    sidebar.style.width = '300px';
    sidebar.style.height = '100%';
    sidebar.style.backgroundColor = '#fff';
    sidebar.style.zIndex = '9999';
    sidebar.style.overflowY = 'auto';
    sidebar.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.5)';
    sidebar.innerHTML = '<h2>Ollama Sidebar</h2><div id="summary-output"></div>';

    // Append the sidebar to the body
    document.body.appendChild(sidebar);
}

const main = () => {
    injectSidebar(); // Inject the sidebar into the page
};

// Ensure the DOM is fully loaded before running the main function
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    main();
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