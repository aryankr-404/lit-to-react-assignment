import React, { useState } from 'react';

const Home = ({ onStart }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation
    if (!apiKey.trim()) {
      setError('Please enter a valid Gemini API key.');
      return;
    }
    setError(''); // Clear previous errors
    onStart(apiKey);
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-gray-800 rounded-xl shadow-2xl space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Cheating Daddy</h1>
        <p className="text-gray-400">Enter your Gemini API key to get started.</p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="api-key" className="sr-only">Gemini API Key</label>
          <input
            id="api-key"
            type="password" // Use password type to obscure the key
            placeholder="Enter Gemini API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-300"
          />
        </div>

        {/* Display error message if it exists */}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          Get Started
        </button>
      </form>
    </div>
  );
};

export default Home;
