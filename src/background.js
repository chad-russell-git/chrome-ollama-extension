const SUMMARY_REQUEST = "summarize_page";

chrome.runtime.onInstalled.addListener(() => {
    console.log("Chrome Extension Summarizer installed.");
});

console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background script:', request);
    if (request.action === 'fetchSummary') {
        console.log('Fetching summary from background script');
        // Add fetch logic here if applicable
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === SUMMARY_REQUEST) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, { action: "get_content" }, (response) => {
                if (response && response.content) {
                    summarizeContent(response.content).then(summary => {
                        sendResponse({ summary });
                    });
                } else {
                    sendResponse({ summary: "No content found." });
                }
            });
            return true; // Keep the message channel open for sendResponse
        });
    }
});

async function summarizeContent(content) {
    const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: content })
    });

    if (!response.ok) {
        throw new Error("Failed to summarize content");
    }

    const data = await response.json();
    return data.summary;
}