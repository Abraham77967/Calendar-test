// Spotify Embed Widget Implementation with OAuth Authentication
document.addEventListener('DOMContentLoaded', () => {
    // Get the container element where we'll insert the Spotify embed
    const spotifyContainer = document.getElementById('spotify-embed-container');
    const spotifyWidget = document.querySelector('.spotify-widget');
    const spotifyHeader = document.querySelector('.spotify-header');
    
    if (!spotifyContainer) {
        console.error('Spotify container not found!');
        return;
    }
    
    // ========== Spotify API Configuration ==========
    const clientId = '82f6edcd7d0648eba0f0a297c8c2c197'; // Your Spotify Client ID
    const redirectUri = 'https://abraham77967.github.io/Calendar-test'; // Your redirect URI - removed trailing slash
    
    // Debug message to verify configuration
    console.log('Spotify Configuration:', { clientId, redirectUri });
    
    // Scopes define the permissions your app is requesting
    const scopes = [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-read-collaborative'
    ];

    // PKCE Auth Code Flow - Generate a code verifier and challenge
    const generateRandomString = length => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
    
    // Generate SHA-256 hash for the code challenge
    const generateCodeChallenge = async (codeVerifier) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    // State is used to prevent CSRF attacks
    const state = generateRandomString(16);
    const codeVerifier = generateRandomString(64);
    
    // Store the code verifier and state in localStorage
    localStorage.setItem('spotify_auth_state', state);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    
    // Get URL query parameters
    const getQueryParams = () => {
        const queryParams = {};
        const query = window.location.search.substring(1);
        const pairs = query.split('&');
        
        console.log('URL Query:', query);
        
        for (let i = 0; i < pairs.length; i++) {
            if (!pairs[i]) continue;
            const pair = pairs[i].split('=');
            queryParams[pair[0]] = decodeURIComponent(pair[1] || '');
        }
        
        return queryParams;
    };
    
    // Check if we're returning from Spotify authentication
    const queryParams = getQueryParams();
    
    // Check for authorization code and errors in query params
    const authCode = queryParams.code;
    const receivedState = queryParams.state;
    const errorParam = queryParams.error;
    
    // Debug message to check authentication parameters
    console.log('Auth Params:', { 
        authCode: authCode ? 'Present' : 'Not found', 
        receivedState: receivedState || 'Not found',
        error: errorParam || 'None' 
    });
    
    // Initialize the widget based on authentication status
    if (authCode && receivedState === localStorage.getItem('spotify_auth_state')) {
        // We have an authorization code, need to exchange for token
        console.log('Authorization code received, exchanging for token');
        exchangeCodeForToken(authCode);
    } else {
        // User is not authenticated, show login button
        console.log('Spotify not authenticated, showing login view');
        if (errorParam) {
            console.error('Spotify auth error:', errorParam);
        }
        initializeLoginView();
    }
    
    /**
     * Exchanges the authorization code for an access token
     * @param {string} code - The authorization code from Spotify
     */
    async function exchangeCodeForToken(code) {
        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        
        console.log('Exchanging code for token with code verifier:', codeVerifier ? 'Present' : 'Not found');
        
        if (!codeVerifier) {
            console.error('No code verifier found in localStorage');
            initializeLoginView();
            return;
        }
        
        try {
            console.log('Making token exchange request to serverless function');
            
            // Call our serverless function to exchange the code for a token
            const response = await fetch('/api/spotify-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    codeVerifier: codeVerifier,
                    redirectUri: redirectUri
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to exchange code for token');
            }
            
            const data = await response.json();
            console.log('Token exchange successful');
            
            // Store tokens in localStorage
            localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            
            // Store expiration time (current time + expires_in seconds)
            const expiresAt = Date.now() + (data.expires_in * 1000);
            localStorage.setItem('spotify_token_expires_at', expiresAt);
            
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Initialize the authenticated view with the access token
            initializeAuthenticatedView(data.access_token);
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            
            // Show error to user
            spotifyContainer.innerHTML = `
                <div class="spotify-error-message">
                    <h4>Authentication Error</h4>
                    <p>There was a problem connecting to Spotify: ${error.message}</p>
                    <button id="spotify-retry-button" class="spotify-btn">Try Again</button>
                </div>
            `;
            
            document.getElementById('spotify-retry-button').addEventListener('click', () => {
                initializeLoginView();
            });
        }
    }
    
    /**
     * Refreshes the access token using the refresh token
     * @returns {Promise<string>} A promise that resolves to the new access token
     */
    async function refreshAccessToken() {
        const refreshToken = localStorage.getItem('spotify_refresh_token');
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        
        try {
            // Call our serverless function to refresh the token
            const response = await fetch('/api/spotify-refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to refresh token');
            }
            
            const data = await response.json();
            
            // Update the stored access token and expiration time
            localStorage.setItem('spotify_access_token', data.access_token);
            const expiresAt = Date.now() + (data.expires_in * 1000);
            localStorage.setItem('spotify_token_expires_at', expiresAt);
            
            return data.access_token;
        } catch (error) {
            console.error('Error refreshing token:', error);
            // If refresh fails, redirect to login
            initializeLoginView();
            throw error;
        }
    }
    
    /**
     * Gets a valid access token, refreshing if necessary
     * @returns {Promise<string>} A promise that resolves to a valid access token
     */
    async function getValidAccessToken() {
        const accessToken = localStorage.getItem('spotify_access_token');
        const expiresAt = localStorage.getItem('spotify_token_expires_at');
        
        // If token is expired or will expire in the next 5 minutes
        if (!accessToken || !expiresAt || Date.now() > (expiresAt - 300000)) {
            console.log('Token expired or about to expire, refreshing...');
            return refreshAccessToken();
        }
        
        return accessToken;
    }
    
    /**
     * Makes an authenticated request to the Spotify API
     * @param {string} endpoint - The API endpoint (without the base URL)
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - The response JSON
     */
    async function spotifyApiRequest(endpoint, options = {}) {
        const token = await getValidAccessToken();
        
        const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }
        
        return response.json();
    }
    
    /**
     * Fetches the user's playlists from Spotify API
     * @param {string} token - The Spotify access token
     */
    async function fetchUserPlaylists(token) {
        console.log('Fetching user playlists...');
        
        try {
            // First, get the user's Spotify ID
            const userData = await spotifyApiRequest('/me');
            console.log('User data received:', userData.display_name);
            
            // Now fetch the user's playlists
            const playlistData = await spotifyApiRequest(`/users/${userData.id}/playlists?limit=50`);
            console.log(`Loaded ${playlistData.items.length} playlists`);
            
            // Update the playlist selector with the user's playlists
            updatePlaylistSelector(playlistData.items, token);
        } catch (error) {
            console.error('Error fetching playlists:', error);
            
            // Show error in the container
            spotifyContainer.innerHTML = `
                <div class="spotify-error">
                    <p>Failed to load playlists: ${error.message}</p>
                    <button id="spotify-retry-button" class="spotify-btn">Retry</button>
                </div>
            `;
            
            document.getElementById('spotify-retry-button').addEventListener('click', () => {
                fetchUserPlaylists(token);
            });
        }
    }
    
    /**
     * Initializes the Spotify login view
     */
    function initializeLoginView() {
        // Update header
        if (spotifyHeader) {
            spotifyHeader.innerHTML = '<h3>Music</h3>';
        }
        
        // Create login button interface
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
        `;
        
        spotifyContainer.innerHTML = '';
        spotifyContainer.appendChild(loginContainer);
        
        // Add event listener to login button
        document.getElementById('spotify-login-button').addEventListener('click', async () => {
            // Generate and store code challenge
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            
            // Save state and code verifier in localStorage
            localStorage.setItem('spotify_auth_state', state);
            localStorage.setItem('spotify_code_verifier', codeVerifier);
            
            console.log('Auth state saved to localStorage:', state);
            console.log('Code verifier saved, challenge generated:', { 
                verifier: codeVerifier.substring(0, 5) + '...',
                challenge: codeChallenge.substring(0, 5) + '...' 
            });
            
            // Redirect to Spotify authorization page with PKCE parameters
            const authEndpoint = 'https://accounts.spotify.com/authorize';
            const authParams = new URLSearchParams({
                client_id: clientId,
                response_type: 'code',
                redirect_uri: redirectUri,
                code_challenge_method: 'S256',
                code_challenge: codeChallenge,
                scope: scopes.join(' '),
                state: state,
                show_dialog: 'true'
            });
            
            const authorizeUrl = `${authEndpoint}?${authParams.toString()}`;
            
            console.log('Redirecting to Spotify auth URL with PKCE flow:', authorizeUrl);
            window.location.href = authorizeUrl;
        });
    }
    
    /**
     * Initializes the authenticated view after successful Spotify login
     * @param {string} token - The Spotify access token
     */
    function initializeAuthenticatedView(token) {
        // Update the widget to show loading state
        if (spotifyHeader) {
            spotifyHeader.innerHTML = `
                <h3>Music</h3>
                <button id="spotify-logout-button" class="spotify-btn logout">Disconnect</button>
            `;
        }
        
        spotifyContainer.innerHTML = '<div class="spotify-loading">Loading your playlists...</div>';
        
        // Add logout button functionality
        document.getElementById('spotify-logout-button').addEventListener('click', () => {
            // Clear spotify auth data
            localStorage.removeItem('spotify_auth_state');
            localStorage.removeItem('spotify_code_verifier');
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_refresh_token');
            
            // Reset to login view
            initializeLoginView();
        });
        
        // Create playlist controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'spotify-controls';
        controlsContainer.innerHTML = `
            <div class="playlist-selector-container">
                <select id="playlist-selector" class="playlist-dropdown">
                    <option value="" disabled selected>Loading playlists...</option>
                </select>
            </div>
        `;
        
        // Insert the controls before the embed container
        spotifyContainer.parentNode.insertBefore(controlsContainer, spotifyContainer);
        
        // Fetch user's playlists from Spotify API
        fetchUserPlaylists(token);
    }
    
    /**
     * Updates the playlist selector with user's playlists
     * @param {Array} playlists - The user's playlists from Spotify API
     * @param {string} token - The Spotify access token
     */
    function updatePlaylistSelector(playlists, token) {
        console.log('Updating playlist selector with', playlists.length, 'playlists');
        
        const playlistSelector = document.getElementById('playlist-selector');
        if (!playlistSelector) {
            console.error('Playlist selector element not found!');
            return;
        }
        
        // Clear existing options
        playlistSelector.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a playlist';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        playlistSelector.appendChild(defaultOption);
        
        // Add user playlists as options
        playlists.forEach(playlist => {
            console.log('Adding playlist:', playlist.name);
            const option = document.createElement('option');
            option.value = playlist.id;
            option.textContent = playlist.name;
            option.dataset.uri = playlist.uri;
            playlistSelector.appendChild(option);
        });
        
        // Add event listener for playlist selection
        playlistSelector.addEventListener('change', (e) => {
            const playlistId = e.target.value;
            const selectedOption = playlistSelector.options[playlistSelector.selectedIndex];
            const playlistUri = selectedOption.dataset.uri;
            
            console.log('Selected playlist:', selectedOption.textContent, playlistUri);
            
            // Load the selected playlist
            loadPlaylist(playlistUri);
        });
        
        // Clear loading message
        spotifyContainer.innerHTML = '<p class="spotify-select-prompt">Select a playlist to start playing</p>';
    }
    
    /**
     * Loads and displays a Spotify playlist
     * @param {string} playlistUri - Spotify playlist URI
     */
    function loadPlaylist(playlistUri) {
        console.log('Loading playlist with URI:', playlistUri);
        try {
            const embedHtml = renderSpotifyEmbed(playlistUri);
            console.log('Generated embed HTML');
            spotifyContainer.innerHTML = embedHtml;
        } catch (error) {
            console.error('Error creating Spotify embed:', error);
            spotifyContainer.innerHTML = '<p>Unable to load Spotify player</p>';
        }
    }
});

/**
 * Renders a Spotify embed using an iframe
 * @param {string} src - Spotify URL or URI
 * @param {string} theme - 'light' or 'dark'
 * @returns {string} - HTML string for the iframe
 */
function renderSpotifyEmbed(src, theme = 'light') {
    // Default sizes
    const DEFAULT_WIDTH = '100%';
    const DEFAULT_HEIGHT = '352';
    
    // Parse the URL to get the embed URL
    const embedUrl = parseSpotifyUrl(src, theme);
    
    if (!embedUrl) {
        return '<p>Invalid Spotify URL or URI</p>';
    }
    
    // Create the iframe HTML
    return `<iframe 
        src="${embedUrl}" 
        width="${DEFAULT_WIDTH}" 
        height="${DEFAULT_HEIGHT}" 
        frameborder="0" 
        allowtransparency="true" 
        allow="encrypted-media"
        style="border-radius: 12px;"
    ></iframe>`;
}

/**
 * Parses a Spotify URL or URI and returns the embed URL
 * @param {string} src - Spotify URL or URI
 * @param {string} theme - 'light' or 'dark'
 * @returns {string} - Embed URL
 */
function parseSpotifyUrl(src, theme) {
    if (!src) return '';
    
    // Check if it's a Spotify URL
    if (src.includes('open.spotify.com')) {
        // Replace the open.spotify.com with embed.spotify.com and add theme
        return src.replace('open.spotify.com', 'embed.spotify.com') + `?theme=${theme}`;
    }
    
    // Check if it's a Spotify URI (spotify:playlist:xxxx)
    if (src.startsWith('spotify:')) {
        const parts = src.split(':');
        if (parts.length >= 3) {
            const type = parts[1]; // track, album, playlist, etc.
            const id = parts[2];
            return `https://embed.spotify.com/?uri=spotify:${type}:${id}&theme=${theme}`;
        }
    }
    
    return '';
} 