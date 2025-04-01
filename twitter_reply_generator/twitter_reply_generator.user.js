// ==UserScript==
// @name        Twitter Reply Generator
// @namespace   https://github.com/abhijais04/tampermonkey-scripts/
// @version     0.3
// @description Adds a button to X.com to generate tweet replies using a locally hosted LLM.
// @author      abhijais04
// @match       https://x.com/*
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Helper function for making API calls
    const callLLM = function callLLM(prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'http://localhost:11434/api/generate', // Default Ollama API endpoint
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    model: 'llama3.2:latest', // Configurable model
                    prompt: prompt,
                    stream: false // Get the full response at once
                }),
                onload: function(response) {
                    // Check for successful HTTP status
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            // Parse the JSON response
                            const jsonResponse = JSON.parse(response.responseText);
                            resolve(jsonResponse.response); // Resolve with the generated text
                        } catch (error) {
                            // Handle JSON parsing errors
                            reject(new Error('Failed to parse JSON response: ' + error.message +
                                              '\nResponse Text: ' + response.responseText));
                        }
                    } else {
                        // Handle HTTP errors
                        reject(new Error('HTTP error! status: ' + response.status +
                                          '\nResponse Text: ' + response.responseText));
                    }
                },
                onerror: function(error) {
                    // Handle network errors
                    reject(new Error("Network error: " + error.message));
                },
                ontimeout: function() {
                    // Handle request timeouts
                    reject(new Error("Request timed out"));
                }
            });
        });
    };

    // Function to extract tweet text. Handles nested spans.
    const extractTweetText = function extractTweetText() {
        // Find the main tweet text container using its data-testid
        let tweetDiv = document.querySelector('div[data-testid="tweetText"]');
        if (!tweetDiv) {
            console.warn("Tweet div with data-testid='tweetText' not found.");
            return null; // Return null if the container isn't found
        }

        // Get all span elements within the tweet container
        const spans = tweetDiv.querySelectorAll('span');
        let fullText = '';
        // Concatenate text from all spans, adding spaces
        spans.forEach(span => {
            fullText += span.innerText + ' ';
        });

        fullText = fullText.trim(); // Remove leading/trailing spaces

        return fullText;
    };

    // Function to set text in the Twitter reply box
    function setTwitterReplyText(newText) {
        // Find the reply textarea using its data-testid
        let replyBox = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (!replyBox) {
            console.warn("Reply box with data-testid='tweetTextarea_0' not found.");
            return; // Exit if the reply box isn't found
        }

        // Focus the reply box before inserting text
        replyBox.focus();

        // Use document.execCommand for better compatibility with Twitter's input handling
        // This simulates user input more effectively than setting .value directly
        document.execCommand('insertText', false, newText);

        // Dispatch an input event to ensure Twitter updates its state (e.g., character count)
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
        /* Main Button Styling */
        .gen-reply-button {
            /* Default multicolor gradient background */
            background: linear-gradient(45deg, #ff8a00, #e52e71, #8a2be2, #4169e1);
            background-size: 400% 400%; /* Increase size for animation */
            color: #fff; /* White text for better contrast */
            position: fixed;
            top: 50%;
            left: 70%;
            transform: translateY(-50%);
            padding: 12px 24px; /* Slightly larger padding */
            font-size: 15px;
            cursor: pointer;
            border-radius: 30px; /* More rounded corners */
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); /* Subtle shadow */
            border: none;
            /* Transition for background, transform, and box-shadow */
            transition: background-position 0.8s ease, transform 0.2s ease, box-shadow 0.3s ease;
            z-index: 1000;
            display: inline-block; /* Needed for positioning context */
            animation: gradientBG 10s ease infinite; /* Animate gradient by default */
        }

        /* Keyframes for default background animation */
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Button Hover State */
        .gen-reply-button:hover {
            /* Change background position on hover for a smooth color shift */
            background-position: 100% 50%;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3); /* Enhance shadow on hover */
            transform: translateY(-52%); /* Slight lift effect */
        }

        /* Button Active (Click) State */
        .gen-reply-button:active {
            transform: translateY(-48%); /* Press down effect */
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); /* Reduce shadow */
        }

        /* Dropdown Container Styling */
        .gen-reply-button .dropdown-content {
            /* Initial state: hidden and slightly shifted up */
            display: block;
            opacity: 0;
            pointer-events: none; /* Prevent interaction when hidden */
            transform: translateY(-10px); /* Start slightly above */
            position: absolute;
            background-color: #ffffff; /* White background */
            min-width: 200px;
            box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
            padding: 10px;
            z-index: 1; /* z-index relative to parent button */
            border-radius: 8px; /* Rounded corners */
            top: 100%; /* Position below the button */
            left: 0;
            right: auto;
            margin-top: 5px; /* Small gap */
            border: 1px solid #ddd; /* Light border */
            /* Transition for gradual appearance */
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        /* Dropdown Visible State (on button hover) */
        .gen-reply-button:hover .dropdown-content {
            /* Final state: visible and in position */
            opacity: 1;
            pointer-events: auto; /* Allow interaction when visible */
            transform: translateY(0); /* Move to final position */
        }

        /* Dropdown Link Styling */
        .gen-reply-button .dropdown-content a {
            color: #333; /* Darker text color */
            padding: 10px 15px; /* More padding */
            text-decoration: none;
            display: block;
            border-radius: 5px; /* Rounded corners for links */
            transition: background-color 0.2s ease, color 0.2s ease; /* Smooth hover effect */
            font-size: 14px;
        }

        /* Dropdown Link Hover State */
        .gen-reply-button .dropdown-content a:hover {
            background-color: #f0f0f0; /* Light grey background on hover */
            color: #000; /* Black text on hover */
        }

        /* Error message styling (unchanged) */
        .error-popup {
            position: fixed;
            top: 20px; /* Slightly lower */
            left: 50%;
            transform: translateX(-50%);
            background-color: #FF4444;
            color: white;
            padding: 15px 25px; /* More padding */
            border-radius: 8px; /* Rounded corners */
            z-index: 2000; /* High z-index to appear over most elements */
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
            font-size: 14px;
            animation: slideDownFadeIn 0.4s ease-out forwards, fadeOut 0.4s 4.6s ease-in forwards;
        }
        .error-popup button {
            margin-left: 15px;
            background-color: #CC0000;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        .error-popup button:hover {
            background-color: #AA0000;
        }
        /* Updated animations for smoother entry/exit */
        @keyframes slideDownFadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `);

    // Array defining the reply options (name displayed, tone used in prompt)
    const replyOptions = [
        { 'name': 'Disagree with data', 'tone': 'opposing backed up by data and facts' },
        { 'name': 'Condescending', 'tone': 'condescending with high degree of offense, but backed by facts' },
        { 'name': 'Rage bait', 'tone': 'such that it enrages people reading it. Make the tone highly offensive.' },
        { 'name': 'Supportive', 'tone': 'supportive and encouraging' },
        { 'name': 'Support with data', 'tone': 'Supporting and backed-up by data' },
        { 'name': 'Sarcastic', 'tone': 'Opposing viewpoint with sarcasm' }, // Added default as an option
    ];

    // Create the dropdown container element
    let dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';

    // Populate the dropdown with options from the array
    for (let index = 0; index < replyOptions.length; index++) {
        const replyOptionContent = replyOptions[index];
        let replyOption = document.createElement('a'); // Use anchor tags for clickable items
        replyOption.href = "#"; // Add href for semantics, prevent default later
        replyOption.textContent = replyOptionContent.name;
        replyOption.dataset.tone = replyOptionContent.tone; // Store tone in data attribute
        dropdownContent.appendChild(replyOption);

        // Add click listener to each dropdown option
        replyOption.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default anchor behavior (like scrolling to top)
            const tone = this.dataset.tone; // Get the tone from the clicked element
            generateReply(tone); // Call generateReply with the selected tone
        });
    }

    // Create the main button element
    const newButton = document.createElement('button');
    newButton.className = 'gen-reply-button';
    newButton.textContent = 'Reply with AI ✨'; // Added emoji for flair
    newButton.appendChild(dropdownContent); // Append dropdown content to the button

    // Function to display error messages in a styled popup
    function displayErrorMessage(message) {
        // Remove existing error popups first
        const existingPopup = document.querySelector('.error-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create the popup elements
        let errorPopup = document.createElement('div');
        errorPopup.className = 'error-popup';
        errorPopup.textContent = message;

        let closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.onclick = function() {
            errorPopup.remove(); // Remove popup on close button click
        };
        errorPopup.appendChild(closeButton);
        document.body.appendChild(errorPopup); // Add popup to the page

        // Automatically remove the popup after some time (handled by CSS animation 'fadeOut')
    }

    // Function to generate the reply using the selected tone
    function generateReply(tone) {
        const tweetText = extractTweetText(); // Get the text of the tweet being replied to
        if (!tweetText) {
            displayErrorMessage("Failed to extract tweet text. Please ensure the tweet is fully loaded.");
            return; // Stop if tweet text couldn't be found
        }

        console.log("Selected tone:", tone);

        // Define the default tone if none is provided (shouldn't happen with current setup)
        let replyTone = tone ? tone : 'Opposing viewpoint with sarcasm';

        // Construct the prompt for the LLM
        let prompt = `You are an expert twitter user. You need to generate a reply for the given tweet in a ${replyTone} tone.`
                        + ` Do not generate any additional text, just the response which I can copy and paste directly into twitter.`
                        + ` Your reply MUST be less than 140 characters.` // Emphasize length constraint
                        + ` Do not add any hashtags in the reply.`
                        + ` The tweet is: "` + tweetText + `"`; // Quote the tweet text

        console.log("Sending prompt to LLM:", prompt);

        // Show indicator that generation is in progress
        newButton.textContent = 'Generating...';
        newButton.disabled = true; // Disable button during generation

        // Call the local LLM API
        callLLM(prompt)
            .then(responseText => {
                console.log("Raw API Response:", responseText);
                // Clean up the response: remove leading/trailing quotes and trim whitespace
                responseText = responseText.replace(/^["']|["']$/g, '').trim();
                console.log("Cleaned API Response:", responseText);
                setTwitterReplyText(responseText); // Insert the cleaned text into the reply box
            })
            .catch(error => {
                // Handle errors during the API call
                console.error("Error calling local API:", error);
                displayErrorMessage("Error generating reply: " + error.message);
            })
            .finally(() => {
                 // Re-enable button and restore text regardless of success or failure
                 newButton.textContent = 'Reply with AI ✨';
                 newButton.disabled = false;
                 newButton.appendChild(dropdownContent); 
            });
        }

    // Append the button (with its dropdown) to the document body
    document.body.appendChild(newButton);
})();