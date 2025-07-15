import { useState, useEffect, useCallback, useRef } from 'react'
import { MLCEngineInterface, CreateExtensionServiceWorkerMLCEngine } from '@mlc-ai/web-llm';
import Loading from './Loading.jsx';
import Error from './Error.jsx';
import '../styles.css';

// This is the main App component for the LLM Summarizer extension popup
export default function App() {
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [selectedModel, setSelectedModel] = useState("Hermes-3-Llama-3.2-3B-q4f32_1-MLC");

    // Callback for engine initialization progress
    const initProgressCallback = (initProgress) => {
        console.log(initProgress);
    }

    // Initialize the engine only once
    const [engine, setEngine] = useState(null);
    const engineInitStarted = useRef(false);
    const initEngine = useCallback(async () => {
        chrome.storage.local.get('engineInit', data => {
            if (data.engineInit || engineInit.current || engine) return;
        })
        engineInitStarted.current = true;
        chrome.storage.local.set({ engineInit: true });
        const serviceEngine = await CreateExtensionServiceWorkerMLCEngine(
            selectedModel,
            { initProgressCallback },
        );
        chrome.storage.local.set({ engineInit: false });
        setEngine(serviceEngine);
    })

    // Fetches document.body.innerText from contentScript.js
    const fetchPageContents = () => {
        setError(false);
        return new Promise((resolve) => {
            chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                const port = chrome.tabs.connect(tabs[0].id, { name: "channelName" });
                port.postMessage({});
                port.onMessage.addListener((msg) => {
                    resolve(msg.contents);
                });
            });
        });
    }
    
    // Creates instance of webllm engine and queries the model
    const queryModel = useCallback(async () => {
        if (!engine) return;
        console.log('querying model');
        setLoading(true);
        console.log("Query model engine: ", engine);
        const messages = [
            { role: "system", content: "You are a helpful AI assistant." },
            { role: "user", content: "Using the following webpage innerText, create a detailed summary its its contents and ideas. CONTEXT: " + context },
        ];

        console.log('messages: ', messages);
        const reply = await engine.chat.completions.create({
            messages,
        });
        chrome.storage.local.set({ reply: reply, context: context });
        setLoading(false);
        console.log(reply.choices[0].message);
        console.log(reply.usage);
    }, [engine, context]);

    useEffect(() => {
        initEngine();
        console.log('fetching context');
        fetchPageContents().then(setContext).catch((error) => setError(error));
        console.log('context fetched');
    }, []);
    
    useEffect(() => {
        console.log("context.lenght: ", context.length, "engine?: ", !!engine, "loading?", loading);
        if (context.length > 0 && engine && !loading) {
            chrome.storage.local.get(['context', 'reply'], (data) => {
                if (data.context === context && data.reply) {
                    // Cached reply exists
                    console.log(data.reply.choices[0].message);
                    console.log(data.reply.usage);
                } else {
                    // No cached reply, query the model
                    (async () => {
                        try {
                            console.log('activating');
                            await queryModel();
                        } catch (err) {
                            console.error('queryModel error:', err);
                        }
                    })();
                }
            });
        }
    }, [context, engine]);

    return(
        <div className="popup">
            Activate AI
            {loading && <Loading />}
            {error && <Error />}
        </div>
    )
}