import React, { useState } from 'react';
import Home from './components/Home';
import Chat from './components/Chat';

function App() {
    const [page, setPage] = useState('home'); // 'home' or 'chat'
    const [geminiKey, setGeminiKey] = useState('');

    const handleStart = key => {
        // In a real app, you'd want to validate the key here
        setGeminiKey(key);
        setPage('chat'); // Switch to the chat page
    };

    return (
        // Main container for the entire application
        <main className="min-h-screen flex flex-col items-center justify-center font-sans antialiased bg-transparent">
            {page === 'home' && <Home onStart={handleStart} />}

            {/* Replaced the placeholder with the actual Chat component */}
            {page === 'chat' && <Chat geminiKey={geminiKey} />}
        </main>
    );
}

export default App;
