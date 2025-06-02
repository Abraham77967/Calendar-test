// Spotify Embed Widget Implementation with OAuth Authentication
document.addEventListener('DOMContentLoaded', () => {
    console.log('Spotify widget initializing...');
    
    // Add CSS styles for the Spotify widget
    const style = document.createElement('style');
    style.textContent = `
        .spotify-widget {
            background: #f5f5f5;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .spotify-login-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
        }
        
        .spotify-logo {
            width: 120px;
            margin-bottom: 15px;
        }
        
        .spotify-login-btn {
            background-color: #1DB954;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 10px 30px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 15px;
            transition: background-color 0.3s;
        }
        
        .spotify-login-btn:hover {
            background-color: #1ed760;
        }
        
        .spotify-debug-info {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .spotify-debug-info h4 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
            color: #333;
        }
        
        .spotify-debug-info code {
            background-color: #e9ecef;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.9em;
            color: #e83e8c;
            word-break: break-all;
        }
        
        .debug-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .spotify-demo-section {
            margin-top: 20px;
            text-align: center;
            border-top: 1px solid #e5e5e5;
            padding-top: 15px;
            width: 100%;
        }
        
        .spotify-demo-btn {
            background-color: #333;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 8px 20px;
            font-size: 0.9em;
            cursor: pointer;
            margin-top: 5px;
            transition: background-color 0.3s;
        }
        
        .spotify-demo-btn:hover {
            background-color: #555;
        }
        
        .demo-text {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 8px;
        }
        
        .demo-notice {
            font-size: 0.8em;
            opacity: 0.7;
            margin-bottom: 10px;
            text-align: center;
            font-style: italic;
        }
        
        .spotify-controls {
            margin-bottom: 15px;
        }
        
        .playlist-dropdown {
            width: 100%;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ddd;
            background-color: white;
        }
        
        .spotify-select-prompt {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        
        .spotify-error {
            padding: 15px;
            background-color: #fff4f4;
            border-left: 4px solid #d9534f;
            margin: 10px 0;
        }
        
        .spotify-btn {
            background-color: #1DB954;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 15px;
            cursor: pointer;
            font-size: 0.9em;
            margin-top: 10px;
        }
        
        .spotify-connected-indicator {
            font-size: 0.8em;
            color: #1DB954;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    // Get the container element where we'll insert the Spotify embed
    const spotifyContainer = document.getElementById('spotify-embed-container');
    const spotifyWidget = document.querySelector('.spotify-widget');
    const spotifyHeader = document.querySelector('.spotify-header');
    
    if (!spotifyContainer) {
        console.error('Spotify container not found!');
        return;
    }
    
    // ========== SIMPLE IMPLEMENTATION ==========
    
    // Check if we have an authorization code in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const stateParam = urlParams.get('state');
    
    console.log('URL check:', { 
        authCode: authCode ? 'Present' : 'Not found', 
        state: stateParam || 'Not found' 
    });
    
    // Initialize header
    if (spotifyHeader) {
        spotifyHeader.innerHTML = '<h3>Music</h3>';
    }
    
    if (authCode) {
        // We have an auth code, show debug info and demo player
        console.log('Auth code detected in URL:', authCode.substring(0, 10) + '...');
        
        // Create container with debug info
        const infoContent = document.createElement('div');
        infoContent.className = 'spotify-debug-info';
        infoContent.innerHTML = `
            <h4>Spotify Authentication</h4>
            <p>Authorization code received! 🎉</p>
            <p>Code: <code>${authCode.substring(0, 15)}...${authCode.substring(authCode.length - 10)}</code></p>
            <p>State: <code>${stateParam || 'Not found'}</code></p>
            
            <div class="debug-actions">
                <button id="spotify-demo-button" class="spotify-demo-btn">Show Demo Player</button>
                <button id="spotify-reset-button" class="spotify-btn">Reset Auth</button>
            </div>
            
            <p class="demo-text">
                <strong>Note:</strong> Full integration requires a server component to exchange the code for a token.
                Click "Show Demo Player" to see how the player would look.
            </p>
        `;
        
        spotifyContainer.innerHTML = '';
        spotifyContainer.appendChild(infoContent);
        
        // Add event listeners
        document.getElementById('spotify-demo-button').addEventListener('click', showDemoPlayer);
        document.getElementById('spotify-reset-button').addEventListener('click', resetAuth);
    } else {
        // No auth code, show login button
        const loginContainer = document.createElement('div');
        loginContainer.className = 'spotify-login-container';
        loginContainer.innerHTML = `
            <div class="spotify-login-message">
                <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png" 
                     alt="Spotify Logo" class="spotify-logo">
                <p>Connect your Spotify account to access your playlists</p>
            </div>
            <button id="spotify-login-button" class="spotify-login-btn">
                Connect to Spotify
            </button>
            <div class="spotify-demo-section">
                <p class="demo-text">Or try a demo playlist:</p>
                <button id="spotify-demo-button" class="spotify-demo-btn">
                    Show Demo Playlist
                </button>
            </div>
        `;
        
        spotifyContainer.innerHTML = '';
        spotifyContainer.appendChild(loginContainer);
        
        // Add event listeners
        document.getElementById('spotify-login-button').addEventListener('click', connectToSpotify);
        document.getElementById('spotify-demo-button').addEventListener('click', showDemoPlayer);
    }
    
    /**
     * Initiates the Spotify authentication flow
     */
    function connectToSpotify() {
        console.log('Connecting to Spotify...');
        
        // Spotify API Configuration
        const clientId = '82f6edcd7d0648eba0f0a297c8c2c197';
        const redirectUri = 'https://abraham77967.github.io/Calendar-test';
        
        // Scopes define the permissions your app is requesting
        const scopes = [
            'user-read-private',
            'user-read-email',
            'playlist-read-private',
            'playlist-read-collaborative'
        ];
        
        // Generate a random state for security
        const state = generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);
        
        // Redirect to Spotify authorization
        const authUrl = 'https://accounts.spotify.com/authorize' +
            '?client_id=' + encodeURIComponent(clientId) +
            '&response_type=code' +
            '&redirect_uri=' + encodeURIComponent(redirectUri) +
            '&scope=' + encodeURIComponent(scopes.join(' ')) +
            '&state=' + encodeURIComponent(state) +
            '&show_dialog=true';
        
        console.log('Redirecting to Spotify auth:', authUrl);
        window.location.href = authUrl;
    }
    
    /**
     * Shows a demo Spotify player
     */
    function showDemoPlayer() {
        console.log('Showing demo player');
        
        const demoPlaylistUri = 'spotify:playlist:37i9dQZEVXcIroVdJc5khI';
        
        spotifyContainer.innerHTML = `
            <div class="spotify-demo-player">
                <p class="demo-notice">Demo mode - showing a popular playlist</p>
                ${renderSpotifyEmbed(demoPlaylistUri)}
            </div>
        `;
    }
    
    /**
     * Renders a Spotify embed using an iframe
     * @param {string} uri - Spotify URI
     * @returns {string} - HTML string for the iframe
     */
    function renderSpotifyEmbed(uri) {
        console.log('Rendering Spotify embed for URI:', uri);
        
        // Default sizes
        const DEFAULT_WIDTH = '100%';
        const DEFAULT_HEIGHT = '352';
        
        // Format the embed URL
        let embedUrl;
        
        if (uri.startsWith('spotify:')) {
            // It's a Spotify URI (spotify:playlist:xxxx)
            const parts = uri.split(':');
            if (parts.length >= 3) {
                const type = parts[1]; // track, album, playlist, etc.
                const id = parts[2];
                embedUrl = `https://embed.spotify.com/?uri=spotify:${type}:${id}&theme=light`;
            }
        } else if (uri.includes('open.spotify.com')) {
            // It's a Spotify URL
            embedUrl = uri.replace('open.spotify.com', 'embed.spotify.com') + '?theme=light';
        } else {
            // Assume it's a playlist ID
            embedUrl = `https://embed.spotify.com/?uri=spotify:playlist:${uri}&theme=light`;
        }
        
        // Create the iframe HTML
        return `<iframe 
            src="${embedUrl}" 
            width="${DEFAULT_WIDTH}" 
            height="${DEFAULT_HEIGHT}" 
            frameborder="0" 
            allowtransparency="true" 
            allow="encrypted-media"
            style="border-radius: 12px;">
        </iframe>`;
    }
    
    /**
     * Resets the authentication state
     */
    function resetAuth() {
        console.log('Resetting auth state');
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Clear localStorage
        localStorage.removeItem('spotify_auth_state');
        localStorage.removeItem('spotify_code_verifier');
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expires_at');
        
        // Reload page
        window.location.reload();
    }
    
    /**
     * Generates a random string of specified length
     */
    function generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}); 