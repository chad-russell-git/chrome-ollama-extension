
chrome.action.onClicked.addListener((tab) => {
    // Send a message to the content script in the active tab
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
});

// Handle web requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'proxyRequest') {
        fetch(request.url, {
            method: request.method || 'GET',
            headers: request.headers || {},
            body: request.body || null,
        })
        .then(response => response.text())
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
});