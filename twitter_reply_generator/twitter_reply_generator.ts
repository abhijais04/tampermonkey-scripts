// ==UserScript==
// @name        Button Adder
// @namespace   abhijais04
// @version     0.2
// @description Adds a button to X.com to generate tweet replies using a local API.
// @author      Abhishek
// @match       https://x.com/*
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Helper function for making API calls
    const callLocalAPI = function callLocalAPI(prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'http://localhost:11434/api/generate',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    model: 'llama3.2:latest', // Make this configurable if needed
                    prompt: prompt,
                    stream: false
                }),
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const jsonResponse = JSON.parse(response.responseText);
                            resolve(jsonResponse.response); // Resolve with just the text
                        } catch (error) {
                            reject(new Error('Failed to parse JSON response: ' + error.message +
                                              '\nResponse Text: ' + response.responseText));
                        }
                    } else {
                        reject(new Error('HTTP error! status: ' + response.status +
                                          '\nResponse Text: ' + response.responseText));
                    }
                },
                onerror: function(error) {
                    reject(new Error("Network error: " + error.message));
                },
                ontimeout: function() {
                    reject(new Error("Request timed out"));
                }
            });
        });
    };

    // Function to extract tweet text.  Handles nested spans.
    const extractTweetText = function extractTweetText() {
        let tweetDiv = document.querySelector('div[data-testid="tweetText"]');
        if (!tweetDiv) {
            console.warn("Tweet div with data-testid='tweetText' not found.");
            return null;
        }

        // Get all spans within the tweetDiv
        const spans = tweetDiv.querySelectorAll('span');
        let fullText = '';
        spans.forEach(span => {
            fullText += span.innerText + ' '; // Add space between span texts
        });

        fullText = fullText.trim(); // Remove leading/trailing spaces

        return fullText;
    };

    // Function to set text in the Twitter reply box
    function setTwitterReplyText(newText) {
        let replyBox = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (!replyBox) {
            console.warn("Reply box with data-testid='tweetTextarea_0' not found.");
            return;
        }

        replyBox.focus();

        // Use document.execCommand for better compatibility
        document.execCommand('insertText', false, newText);

        // Dispatch input event to trigger X's internal logic
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        replyBox.dispatchEvent(inputEvent);

        console.log("Successfully set text:", newText);
    }

    // --- UI ---
    // Add custom styles using GM_addStyle
    GM_addStyle(`
        .gen-reply-button {
            background-color: #EFF3F4;
            color: #000;
            position: fixed;
            top: 50%;
            left: 70%;
            transform: translateY(-50%);
            padding: 10px 20px;
            font-size: 15px;
            cursor: pointer;
            border-radius: 20px;
            font-weight: bold;
            box-shadow: none;
            border: none;
            transition: background-color 0.3s ease;
            z-index: 1000; /* Ensure button is above other elements */
        }
        .gen-reply-button:hover {
            background-color: #D0D0D0; /* Slightly darker on hover */
        }
        .gen-reply-button:active {
            background-color: #C0C0C0; /* Slightly darker on click */
        }

        /* Error message styling */
        .error-popup {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #FF4444;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 2000;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease-out, slideOut 0.3s 2.5s ease-in forwards;
        }
        .error-popup button {
            margin-left: 10px;
            background-color: #CC0000;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
        }
        .error-popup button:hover {
            background-color: #AA0000;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-50px); }
            to { opacity: 1; transform: translateX(-50%) translateY(10px); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translateX(-50%) translateY(10px); }
            to { opacity: 0; transform: translateX(-50%) translateY(-50px); }
        }

    `);

    // Create the button element
    const newButton = document.createElement('button');
    newButton.className = 'gen-reply-button';
    newButton.textContent = 'Generate Reply';

    // Function to display error message
    function displayErrorMessage(message) {
        let errorPopup = document.createElement('div');
        errorPopup.className = 'error-popup';
        errorPopup.textContent = message;

        let closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.onclick = function() {
            errorPopup.remove();
        };
        errorPopup.appendChild(closeButton);
        document.body.appendChild(errorPopup);
    }

    // Add event listener to the button
    newButton.addEventListener('click', function() {
        const tweetText = extractTweetText();
        if (!tweetText) {
            displayErrorMessage("Failed to extract tweet text. Please ensure the tweet is fully loaded.");
            return;
        }

        let generateResponsePromise = callLocalAPI("You are an expert twitter user. You need to generate a reply for the given tweet in sarcastic comeback with contradicting viewpoint style. Do not generate any additional text , just the response which I can copy and paste in twitter. Do not add hashtags in the reply. The tweet is " + tweetText);

        generateResponsePromise
            .then(responseText => {
                console.log("API Response:", responseText);
            // Remove double quotes
            responseText = responseText.replace(/^"(.*)"$/, '$1');

                setTwitterReplyText(responseText);
            })
            .catch(error => {
                console.error("Error calling local API:", error);
                displayErrorMessage("Error generating reply: " + error.message);
            });
    });

    // Append the button to the document body
    document.body.appendChild(newButton);

    console.log('Button added by Tampermonkey script!');
})();
