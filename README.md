# Chrome Extension Summarizer

This project is a Chrome extension that summarizes the current web page using a local Ollama deployment. It extracts the text content from the web page and sends it to the Ollama API for summarization.

## Features

- Extracts text content from the current web page.
- Summarizes the extracted text using a local Ollama deployment.
- Displays the summary in a user-friendly popup.

## Installation

1. Clone the repository to your local machine:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd chrome-extension-summarizer
   ```

3. Open Chrome and go to `chrome://extensions/`.

4. Enable "Developer mode" in the top right corner.

5. Click on "Load unpacked" and select the `chrome-extension-summarizer` directory.

## Usage

1. Navigate to any web page you want to summarize.

2. Click on the extension icon in the Chrome toolbar.

3. In the popup, click the "Summarize" button to generate a summary of the current page.

4. The summary will be displayed in the popup.

## Development

- The extension consists of several key files:
  - `src/background.js`: Manages the extension's lifecycle and handles messages.
  - `src/content.js`: Extracts text from the web page.
  - `src/popup/popup.html`: Defines the structure of the popup.
  - `src/popup/popup.js`: Contains the logic for user interactions in the popup.
  - `src/popup/popup.css`: Styles for the popup.
  - `src/utils/api.js`: Utility functions for API calls to the Ollama deployment.
  - `manifest.json`: Configuration file for the Chrome extension.

## Ollama

  When running Ollama locally you must modify the 
OLLAMA_ORIGINS environment variable to OLLAMA_ORIGINS=*.   Your format for the environment variable may vary.   Ollama needs to be run via "Ollama serve" with the CORS environment variable set as opposed to the intance that gets instantiated at startup.    Stop the default instance, load the env variable mentioned above and run "ollama serve".    Pre-reqs are that you have loaded a working LLM model into Ollama. 

## License

This project is licensed under the MIT License.