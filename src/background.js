import { ExtensionServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Hookup an engine to a service worker handler
let handler;
let engineInitInProgress;

console.log('background loaded');
chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "web_llm_service_worker");
  if (handler === undefined) {
    handler = new ExtensionServiceWorkerMLCEngineHandler(port);
  } else {
    handler.setPort(port);
  }
  port.onMessage.addListener(handler.onmessage.bind(handler));
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'requestEngineInit') {
        if (engineInitInProgress) {
            sendResponse({ started: false, reason: "already_in_progress" });
        } else {
            engineInitInProgress = true;
            sendResponse({ started: true });
        }
        return true; // keep the message channel open for async response
    } else if (message.type === 'engineInitDone') {
        engineInitInProgress = false;
        sendResponse({ acknowledged: true });
    } else if (message.type === 'status') {
        sendResponse({ engineInitInProgress });
    }
})