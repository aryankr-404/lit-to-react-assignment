const { BrowserWindow, screen, globalShortcut, ipcMain } = require('electron'); // <-- FIX 1: ipcMain is now imported
const path = require('path');
const { applyStealthMeasures, startTitleRandomization } = require('./stealthFeatures');

// Placeholder for other functions in this file to ensure module.exports works
function ensureDataDirectories() {
    /* Implementation not provided */
}
// FIX 2: Provide a default object to prevent crashes
function getDefaultKeybinds() {
    return {
        moveUp: '',
        moveDown: '',
        moveLeft: '',
        moveRight: '',
        toggleVisibility: '',
        toggleClickThrough: '',
        nextStep: '',
    };
}
function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    // Window control handlers
    ipcMain.handle('set-window-opacity', async (event, opacity) => {
        try {
            mainWindow.setOpacity(opacity);
            return { success: true };
        } catch (error) {
            console.error('Error setting window opacity:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-window', async () => {
        try {
            mainWindow.close();
            return { success: true };
        } catch (error) {
            console.error('Error closing window:', error);
            return { success: false, error: error.message };
        }
    });

    // Set up IPC handlers for Gemini API communication
    ipcMain.handle('initialize-gemini-session', async (event, { apiKey, customPrompt, profile, language }) => {
        try {
            const result = await require('./gemini').initializeGeminiSession(apiKey, customPrompt, profile, language);
            if (result.success && result.session) {
                geminiSessionRef.current = result.session;
                return { success: true };
            }
            return { success: false, error: result.error || 'Failed to initialize session' };
        } catch (error) {
            console.error('Error initializing Gemini session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-gemini-message', async (event, message) => {
        try {
            if (!geminiSessionRef.current) {
                throw new Error('No active Gemini session');
            }
            await geminiSessionRef.current.sendRealtimeInput({
                text: message,
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending message to Gemini:', error);
            return { success: false, error: error.message };
        }
    });

    // Add handler for stopping audio capture
    ipcMain.handle('stop-audio-capture', async () => {
        try {
            if (geminiSessionRef.current) {
                await geminiSessionRef.current.stopAudioCapture();
                return { success: true };
            }
            return { success: false, error: 'No active session' };
        } catch (error) {
            console.error('Error stopping audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    // Add handler for getting current session data
    ipcMain.handle('get-session-data', async () => {
        try {
            return require('./gemini').getCurrentSessionData();
        } catch (error) {
            console.error('Error getting session data:', error);
            return { error: error.message };
        }
    });
}

let mouseEventsIgnored = false;

function createWindow(sendToRenderer, geminiSessionRef, randomNames = null) {
    // Get layout preference (default to 'normal')
    let windowWidth = 1100;
    let windowHeight = 800;

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        frame: true,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        backgroundColor: '#00000000',
        opacity: 1,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
    });

    const { session, desktopCapturer } = require('electron');
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );

    mainWindow.setResizable(false);
    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();

    if (randomNames && randomNames.windowTitle) {
        mainWindow.setTitle(randomNames.windowTitle);
    }

    applyStealthMeasures(mainWindow);
    startTitleRandomization(mainWindow);

    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            mainWindow.webContents
                .executeJavaScript(
                    `
                    (() => {
                        try {
                            const savedKeybinds = localStorage.getItem('customKeybinds');
                            return { keybinds: savedKeybinds ? JSON.parse(savedKeybinds) : null };
                        } catch (e) {
                            return { keybinds: null };
                        }
                    })(); 
                    `
                )
                .then(async savedSettings => {
                    if (savedSettings && savedSettings.keybinds) {
                        keybinds = { ...defaultKeybinds, ...savedSettings.keybinds };
                    }

                    console.log('Defaulting content protection to true for React UI.');
                    mainWindow.setContentProtection(true);

                    updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
                })
                .catch(() => {
                    mainWindow.setContentProtection(true);
                    updateGlobalShortcuts(defaultKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
                });
        }, 150);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);
    return mainWindow;
}

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    // Add a check to ensure keybinds is an object
    if (!keybinds) {
        console.error('updateGlobalShortcuts called with invalid keybinds. Aborting.');
        return;
    }
    // console.log('Updating global shortcuts with:', keybinds);
    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.1);

    const movementActions = {
        moveUp: () => {
            /* ... */
        },
        moveDown: () => {
            /* ... */
        },
        moveLeft: () => {
            /* ... */
        },
        moveRight: () => {
            /* ... */
        },
    };

    Object.keys(movementActions).forEach(action => {
        const keybind = keybinds[action];
        if (keybind) {
            /* ... */
        }
    });

    if (keybinds.toggleVisibility) {
        /* ... */
    }

    if (keybinds.toggleClickThrough) {
        /* ... */
    }

    if (keybinds.nextStep) {
        try {
            globalShortcut.register(keybinds.nextStep, async () => {
                console.log('Next step shortcut triggered');
                // FIX 3: The 'cheddar' object from the Lit UI is gone.
                // We will send a generic IPC message instead, which the React UI can choose to listen for.
                console.log('Sending "next-step-shortcut" to renderer.');
                sendToRenderer('next-step-shortcut');
            });
            console.log(`Registered nextStep: ${keybinds.nextStep}`);
        } catch (error) {
            console.error(`Failed to register nextStep (${keybinds.nextStep}):`, error);
        }
    }
}

module.exports = {
    ensureDataDirectories,
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
