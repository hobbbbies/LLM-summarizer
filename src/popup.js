import * as webllm from "@mlc-ai/web-llm";

const fetchPageContents = () => {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        const port = chrome.tabs.connect(tabs[0].id, { name: "channelName" });
        port.postMessage({});
        port.onMessage.addListener((msg) => {
        console.log("Page contents:", msg.contents);
        context = msg.contents;
        });
    });
}

const setBadgeText = (enabled) => {
    const text = enabled ? 'ON' : 'OFF';
    chrome.action.setBadgeText({ text: text });
}

const checkbox = document.getElementById('enabled');
chrome.storage.sync.get('enabled', (data) => {
    checkbox.checked = !!data.enabled;
    setBadgeText(data.enabled);
});

const initProgressCallback = (initProgress) => {
    console.log(initProgress);
}
const selectedModel = "Hermes-3-Llama-3.2-3B-q4f32_1-MLC";

// Creates instance of webllm engine
const engine = await webllm.CreateMLCEngine(
 selectedModel,
 { initProgressCallback: initProgressCallback }, // engineConfig
);

checkbox.addEventListener('change', async (e) => {
    if(e.target instanceof HTMLInputElement) {
        chrome.storage.sync.set({ 'enabled': e.target.checked});
        setBadgeText(e.target.checked);
        
        if (e.target.checked) {
            /* 
            ---------------
            Web-llm section
            --------------- 
            */
            let context = "";
            console.log('checkbox? ', checkbox.checked);
            // Fetches document.body.innerText from contentScript.js
            fetchPageContents();

            // Callback function to update model loading progress
            const messages = [
                { role: "system", content: "You are a helpful AI assistant." },
                { role: "user", content: "Using the following webpage innerText, create a detailed summary its its contents and ideas. CONTEXT: " + context },
            ]

            console.log('messages: ', messages);
            console.log('context: ', context);
            const reply = await engine.chat.completions.create({
            messages,
            });

            console.log(reply.choices[0].message);
            console.log(reply.usage);
        }
    }
});



