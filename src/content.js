console.log('content script loaded');

// Only the content script is able to access the DOM
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    port.postMessage({ contents: document.body.innerText });
  });
});