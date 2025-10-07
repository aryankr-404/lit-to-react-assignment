import React, { useState, useEffect, useRef } from 'react';
// Import icons from lucide-react
import { Send } from 'lucide-react';

// --- Simple Markdown to HTML converter ---
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
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response, isLoading]);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError('');
    // Clear previous response before generating a new one
    setResponse('');

    // --- MOCKED API CALL ---
    // This simulates a network request without calling the Gemini API.
    setTimeout(() => {
        const sampleResponse = `This is a **sample AI response** generated locally.
        \n*Your prompt was:* "${prompt}"
        \nThis demonstrates how the final output will be rendered. The actual application would use the Gemini API to generate a meaningful response.
        \n\`\`\`javascript
// Sample code block to illustrate formatting
function helloWorld() {
  console.log("UI updated successfully!");
}
helloWorld();
\`\`\``;
        setResponse(sampleResponse);
        setIsLoading(false);
        setPrompt(''); // Clear the input box after "sending"
    }, 1200); // Simulate 1.2 second delay
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-2 md:p-6">
      
      {/* Response Area - Now transparent */}
      <div className="flex-grow overflow-y-auto pr-4 mb-4 text-gray-200 custom-scrollbar">
        {isLoading && (
            <div className="flex justify-center items-center h-full">
                <div className="flex items-center space-x-2 text-gray-400">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    <span>Generating response...</span>
                </div>
            </div>
        )}

        {response && (
            // The response is now directly rendered without a background bubble
            <div className="animate-fade-in prose prose-invert prose-sm max-w-none text-gray-300">
                <Markdown content={response} />
            </div>
        )}

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-auto pt-4 border-t border-gray-700/50">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything..."
            className="w-full p-4 pr-16 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 resize-none leading-tight"
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

