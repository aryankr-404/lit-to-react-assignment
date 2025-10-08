const { contextBridge, ipcRenderer } = require('electron');

// We are creating a safe, isolated bridge by exposing specific functions
// to the frontend under the 'window.electronAPI' object.
contextBridge.exposeInMainWorld('electronAPI', {
    // Initialize a new Gemini session
    initializeGeminiSession: params => ipcRenderer.invoke('initialize-gemini-session', params),

    // Send a message to the Gemini API
    sendGeminiMessage: message => ipcRenderer.invoke('send-gemini-message', message),

    // Stop audio capture
    stopAudioCapture: () => ipcRenderer.invoke('stop-audio-capture'),

    // Get current session data
    getSessionData: () => ipcRenderer.invoke('get-session-data'),

    // Listen for status updates from main process
    onStatusUpdate: callback => {
        const handler = (_event, status) => callback(status);
        ipcRenderer.on('update-status', handler);
        return () => ipcRenderer.removeListener('update-status', handler);
    },

    // Listen for response updates from main process
    onResponseUpdate: callback => {
        const handler = (_event, response) => callback(response);
        ipcRenderer.on('update-response', handler);
        return () => ipcRenderer.removeListener('update-response', handler);
    },

    // Listen for initialization status
    onSessionInitializing: callback => {
        const handler = (_event, status) => callback(status);
        ipcRenderer.on('session-initializing', handler);
        return () => ipcRenderer.removeListener('session-initializing', handler);
    },

    // Listen for conversation turn updates
    onConversationTurnSaved: callback => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('save-conversation-turn', handler);
        return () => ipcRenderer.removeListener('save-conversation-turn', handler);
    },

    // Window control methods
    setWindowOpacity: opacity => ipcRenderer.invoke('set-window-opacity', opacity),
    closeWindow: () => ipcRenderer.invoke('close-window'),
});
