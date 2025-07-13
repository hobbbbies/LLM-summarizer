import { useState, useEffect } from 'react'
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import Loading from './Loading.jsx';
import Error from './Error.jsx';

export default function App() {
    const [on, setOn] = useState('OFF');
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

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

    const initProgressCallback = (initProgress) => {
        console.log(initProgress);
    }
    
    // Creates instance of webllm engine
    const queryModel = async (context) => {
        setLoading(true);
        const selectedModel = "Hermes-3-Llama-3.2-3B-q4f32_1-MLC";
        const engine = await CreateMLCEngine(
            selectedModel,
            { initProgressCallback: initProgressCallback }, // engineConfig
        );

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
        fetchPageContents().then(setContext).catch((error) => setError(error));
    }, []);
    
    useEffect(() => {
        chrome.storage.sync.get('popupState', (data) => {
            if (data.popupState) setOn(data.popupState);
        });
    }, []);

    useEffect(() => {
        console.log('context: ', context);
        if (on === 'ON' && context.length > 0) {
            queryModel(context);
        }
    }, [on, context]);

    useEffect(() => {
        chrome.action.setBadgeText({ text: on });
    }, [on]);
    

    return(
        <div className="popup">
            <label>
            Activate AI
            <input id="enabled" type="checkbox" checked={on === 'ON'} onChange={(switchOn)}/>
            <span class="slider round"></span>
            {loading && <Loading />}
            {error && <Error />}
            </label>
        </div>
    )
}