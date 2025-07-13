import * as webllm from "@mlc-ai/web-llm";

const setBadgeText = (enabled) => {
    const text = enabled ? 'ON' : 'OFF';
    chrome.action.setBadgeText({ text: text });
}

const checkbox = document.getElementById('enabled');
chrome.storage.sync.get('enabled', (data) => {
    checkbox.checked = !!data.enabled;
    setBadgeText(data.enabled);
});

checkbox.addEventListener('change', (e) => {
    if(e.target instanceof HTMLInputElement) {
        chrome.storage.sync.set({ 'enabled': e.target.checked});
        setBadgeText(e.target.checked);
    }
});
/* 
---------------
Web-llm section
--------------- 
*/
let context = "";

// Fetches document.body.innerText from contentScript.js
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

fetchPageContents();

// Callback function to update model loading progress
const initProgressCallback = (initProgress) => {
  console.log(initProgress);
}
const selectedModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

const engine = await webllm.CreateMLCEngine(
  selectedModel,
  { initProgressCallback: initProgressCallback }, // engineConfig
);

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
