import { useState, useEffect } from 'react'
import { MLCEngineInterface, CreateExtensionServiceWorkerMLCEngine } from '@mlc-ai/web-llm';
import Loading from './Loading.jsx';
import Error from './Error.jsx';
import '../styles.css';

export default function App() {
    const [on, setOn] = useState('OFF');
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [selectedModel, setSelectedModel] = useState("Hermes-3-Llama-3.2-3B-q4f32_1-MLC");
    const [engine, setEngine] = useState(null);

    const initProgressCallback = (initProgress) => {
        console.log(initProgress);
    }

    const initEngine = async () => {
         // Grabs from service worker
        const serviceEngine = await CreateExtensionServiceWorkerMLCEngine(
            selectedModel,
            { initProgressCallback }, // engineConfig
        );
        setEngine(serviceEngine);
    }

    const switchOn = () => {
        const newState = on === 'OFF' ? 'ON' : 'OFF';;
        setOn(newState); 
        chrome.storage.sync.set({ popupState: newState });
    }

    // Fetches document.body.innerText from contentScript.js
    const fetchPageContents = () => {
        setError(false);
        return new Promise((resolve) => {
            chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                const port = chrome.tabs.connect(tabs[0].id, { name: "channelName" });
                port.postMessage({});
                port.onMessage.addListener((msg) => {
                    console.log("Page contents:", msg.contents);
                    resolve(msg.contents);
                });
            });
        });
    }
    
    // Creates instance of webllm engine
    const queryModel = async () => {
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
        setLoading(false);
        console.log(reply.choices[0].message);
        console.log(reply.usage);
    }

    useEffect(() => {
        initEngine();
        console.log('fetching context');
        fetchPageContents().then(setContext).catch((error) => setError(error));
        console.log('context fetched');
    }, []);
    
    useEffect(() => {
        chrome.storage.sync.get('popupState', (data) => {
            if (data.popupState) setOn(data.popupState);
        });
    }, []);

    useEffect(() => {
        console.log('context inside useEffect: ', context, 'on: ', on);
        if (on === 'ON' && context.length > 0 && engine) {
            (async () => {
                try {
                    console.log('activating');
                    await queryModel();
                } catch (err) {
                    console.error('queryModel error:', err);
                }
            })();
        }
    }, [on, context, engine]);

    useEffect(() => {
        chrome.action.setBadgeText({ text: on });
    }, [on]);
    

    return(
        <div className="popup">
            <label>
            Activate AI
            <input id="enabled" type="checkbox" checked={on === 'ON'} onChange={switchOn}/>
            {loading && <Loading />}
            {error && <Error />}
            </label>
        </div>
    )
}   