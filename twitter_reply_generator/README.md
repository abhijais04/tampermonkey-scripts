Surfing twitter and need some help with your replies? This script will help you ! Just install tampermonkey, and add this script in your Tampermonkey/GreaseMonkey dashboard. It'll let you choose the tone of your reply, and generate one, based on the tweet you want to reply to. Don't like it. Try again, it'll keep generating new ones.

Currently, this will only work on a laptop, which has ollama running locally. I don't have the money to host an LLM server ya know.


# How to run

1. Install [Ollama](https://ollama.com/) or any other solution which can run LLMs locally.
2. Run `llama3.2:latest` or any other model on your local laptop by using `ollama serve`.
3. If you're not using ollama, or changing the model you're running, then update the script accordingly.
4. Install Greasemonkey, or [TamperMonkey](https://www.tampermonkey.net/) as an extension for your browsre.
5. Paste the content of `twitter_reply_generator.user.js` as a new script in TamperMonkey. That's it. You're ready to go.

# Demo

![demo](https://github.com/user-attachments/assets/5e07fc63-d3e5-4179-8153-331b09e0842a)
