




// const SUMMARY_REQUEST = "summarize_page";

// chrome.runtime.onInstalled.addListener(() => {
//     console.log("Chrome Extension Summarizer installed.");
// });

// console.log('Background script loaded');

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     console.log('Message received in background script:', request);

//     if (request.action === SUMMARY_REQUEST) {
//         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//             const activeTab = tabs[0];
//             chrome.tabs.sendMessage(activeTab.id, { action: "get_content" }, (response) => {
//                 if (response && response.content) {
//                     summarizeContent(response.content)
//                         .then((summary) => {
//                             console.log('Summary generated:', summary);
//                             sendResponse({ summary }); // Send the summary back
//                         })
//                         .catch((error) => {
//                             console.error('Error summarizing content:', error);
//                             sendResponse({ error: "Failed to summarize content" }); // Handle errors
//                         });
//                 } else {
//                     console.warn("No content received from content script.");
//                     sendResponse({ summary: "No content found." }); // Handle empty content
//                 }
//             });

//             // Return true to keep the message channel open for asynchronous sendResponse
//             return true;
//         });

//         // Return true here as well to ensure the message port stays open
//         return true;
//     }

//     // Handle unknown actions
//     sendResponse({ error: "Unknown action" });
//     return true;
// });

// async function summarizeContent(content) {
//     const response = await fetch("http://localhost:11434/api/chat", {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({ text: content })
//     });

//     if (!response.ok) {
//         throw new Error("Failed to summarize content");
//     }

//     const data = await response.json();
//     return data.summary;
// }