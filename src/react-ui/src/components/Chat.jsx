import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

const Markdown = ({ content }) => {
    const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900/50 p-3 rounded-lg my-2 text-sm font-mono"><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-700/50 px-1.5 py-0.5 rounded text-sm">$1</code>')
        .replace(/\n/g, '<br />');

    return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedContent }} />;
};

// --- Main Chat Component ---
const Chat = ({ geminiKey }) => {
    // Chat state
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [opacity, setOpacity] = useState(1);
    const chatEndRef = useRef(null);

    // Handle opacity change
    const handleOpacityChange = async value => {
        setOpacity(value);
        try {
            await window.electronAPI.setWindowOpacity(value);
        } catch (error) {
            console.error('Failed to set window opacity:', error);
        }
    };

    // Handle window close
    const handleClose = async () => {
        try {
            await window.electronAPI.closeWindow();
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    };

    // --- Initialize session when geminiKey changes ---
    useEffect(() => {
        if (!geminiKey) {
            console.log('No API key provided');
            return;
        }

        if (!window.electronAPI?.initializeGeminiSession) {
            console.error('Electron API not available');
            return;
        }

        const initSession = async () => {
            try {
                setIsLoading(true);
                const result = await window.electronAPI.initializeGeminiSession({
                    apiKey: geminiKey,
                    profile: 'interview', // Default profile
                    language: 'en-US', // Default language
                });

                if (!result.success) {
                    throw new Error(result.error || 'Failed to initialize session');
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, [geminiKey]);

    // --- Effect to listen for updates from the Electron main process ---
    useEffect(() => {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            return;
        }

        // Set up listeners for various events
        const statusUnsubscribe = window.electronAPI.onStatusUpdate(status => {
            console.log('Status update:', status);
            if (status.startsWith('Error:')) {
                setError(status.replace('Error:', '').trim());
                setIsLoading(false);
            } else if (status === 'Live session connected') {
                setError('');
                setIsLoading(false);
            } else if (status === 'Session closed') {
                setError('Session closed unexpectedly');
                setIsLoading(false);
            } else if (status === 'Response complete' || status === 'Ready') {
                // Clear loading state when response is complete or ready for next input
                setIsLoading(false);
                setError('');
            }
        });

        const responseUnsubscribe = window.electronAPI.onResponseUpdate(newResponse => {
            setResponse(newResponse);
            setError('');
        });

        const initializingUnsubscribe = window.electronAPI.onSessionInitializing(initializing => {
            setIsLoading(initializing);
            if (initializing) {
                setError('');
            }
        });

        // Cleanup function to remove all listeners
        return () => {
            statusUnsubscribe();
            responseUnsubscribe();
            initializingUnsubscribe();
        };
    }, []); // Empty array means this effect runs only once when component mounts

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [response, isLoading]);

    // --- Modified: handleSend function to use new API ---
    const handleSend = async () => {
        if (!prompt.trim() || isLoading) return;

        if (!geminiKey) {
            setError('Please provide a Gemini API key');
            return;
        }

        if (!window.electronAPI?.sendGeminiMessage) {
            setError('Electron API not available');
            return;
        }

        setIsLoading(true);
        setError('');
        // Don't clear response here - let the stream update it

        try {
            const currentPrompt = prompt; // Store the current prompt
            setPrompt(''); // Clear the input box immediately for better UX

            console.log('[React] Sending prompt to Gemini API');
            const result = await window.electronAPI.sendGeminiMessage(currentPrompt);

            if (!result.success) {
                throw new Error(result.error || 'Failed to send message');
            }
        } catch (e) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    const handleKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative w-full max-w-4xl h-[90vh] flex flex-col bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-2 md:p-6">
            {/* Window Controls */}
            <div className="absolute top-2 right-2 flex items-center space-x-4 z-50 no-drag">
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-white/60">Opacity</span>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={opacity}
                        onChange={e => handleOpacityChange(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                </div>
                <button
                    onClick={handleClose}
                    className="p-1.5 text-white/60 hover:text-red-500 hover:bg-white/10 rounded-lg transition-colors"
                    title="Close window"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-4 mb-4 text-gray-100 custom-scrollbar">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <div className="flex items-center space-x-2 text-gray-300">
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            <span>Generating response...</span>
                        </div>
                    </div>
                )}

                {response && (
                    <div className="animate-fade-in prose prose-invert prose-sm max-w-none text-gray-100">
                        <Markdown content={response} />
                    </div>
                )}

                {error && <p className="text-red-400 mt-4 text-center font-semibold">{error}</p>}
                <div ref={chatEndRef} />
            </div>

            <div className="mt-auto pt-4 border-t border-white/10">
                <div className="relative">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className="w-full p-4 pr-16 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 resize-none leading-tight"
                        rows="2"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !prompt.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110"
                        aria-label="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
