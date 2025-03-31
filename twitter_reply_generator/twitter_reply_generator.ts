// ==UserScript==
// @name         Button Adder
// @namespace    abhijais04
// @version      0.1
// @description  Adds a button to google.com
// @author       Abhishek
// @match        https://x.com/**/status/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==
(function() {
    'use strict';

    // Replace your fetch call with this
    const callLocalAPI = function callLocalAPI(inputText, replyFlavor) {
        const prompt = "You are an expert twitter user. You need to generate a reply for the given tweet in " + replyFlavor + " style. Do not generate any additional text , just the response which I can copy and paste in twitter. Do not add hashtags in the reply. The tweet is " + inputText;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'http://localhost:11434/api/generate',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    model: 'llama3.2:latest',
                    prompt: prompt,
                    stream: false
                }),
                onload: function(response) {
                    try {
                        const jsonResponse = JSON.parse(response.responseText);
                        resolve(jsonResponse);
                    } catch (error) {
                        reject(new Error('Failed to parse JSON response: ' + error.message));
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }
    const extractTweetText = function extractTweetText() {
     // Select the div with data-testid="tweetText"
        let tweetDiv = document.querySelector('div[data-testid="tweetText"]');

        if (tweetDiv) {
            // Extract the text inside the span
            let tweetText = tweetDiv.querySelector('span')?.innerText;

            if (tweetText) {
                console.log("Extracted Text:", tweetText);
                return tweetText;
            } else {
                console.log("Span not found inside tweet div.");
            }
        } else {
            console.log("Tweet div not found.");
        }
    }

    function setTwitterReplyText(newText) {
        let replyBox = document.querySelector('[data-testid="tweetTextarea_0"]');

        if (replyBox) {
            replyBox.focus(); // Ensure the box is active

            let selection = window.getSelection();
            let range = document.createRange();

            // Ensure there's an editable child element to insert text into
            if (replyBox.childNodes.length === 0) {
                replyBox.appendChild(document.createTextNode(""));
            }

            // Set cursor at the end of the existing text
            range.selectNodeContents(replyBox);
            range.collapse(false);

            selection.removeAllRanges();
            selection.addRange(range);

            // Insert text properly (mimics real user input)
            document.execCommand("insertText", false, newText);

            console.log("Successfully set text:", newText);
        } else {
            console.log("Reply box not found.");
        }
    }

    // Create a new button element
    const newButton = document.createElement('button');
    newButton.textContent = 'Generate Reply';
    newButton.style.backgroundColor = '#EFF3F4';
    newButton.style.color = '#000';// Black text
    newButton.style.position = 'fixed'; // Make it stay in place on scroll
    newButton.style.top = '50%';
    newButton.style.left = '70%';
    newButton.style.boxShadow = 'none';
    newButton.style.padding = '10px 20px';
    newButton.style.fontSize = '15px';
    newButton.style.cursor = 'pointer';
    newButton.style.alignItems = 'center';// Align text properly
    newButton.style.borderRadius = '20px';// Rounded corners
    newButton.style.fontWeight = 'bold';// Bold text
    // newButton.style.display = 'flex';// Match button layout

    // Add an event listener to the button
    /**
    TODO: Add flavors like: Supporting, Rage-Bait, Opposing etc.
    TODO: Add a closable text popover, or better the generated text should be pasted in the reply column
    **/
    newButton.addEventListener('click', function() {
        const tweet = extractTweetText();
        //const tweet = 'India is the only country where an Indian will put up an encouraging statistic of improvement and three people in the replies will say that it’s not good enough. We are way too pessimistic. It’s drowning us';
        let generateResponsePromise = callLocalAPI(tweet, "sarcastic comeback with contradicting viewpoint");
        generateResponsePromise
            .then(response => {
            console.log("API Response:", response.response);
            //putTextToReplyBox(response.response);
            let tweetText = response.response;
            // Remove double quotes
            tweetText = tweetText.replace(/^"(.*)"$/, '$1');
            setTwitterReplyText(tweetText);
        })
            .catch(error => {
            console.error("Error calling local API:", error);
        });
    });

    // Append the button to the document body
    document.body.appendChild(newButton);

    console.log('Button added by Tampermonkey script!');
}
)();
