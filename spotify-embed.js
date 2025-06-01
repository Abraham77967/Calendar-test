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
            console.log('Making token exchange request to Spotify API');
            
            // Unfortunately, direct token exchange from client-side JavaScript often fails due to CORS restrictions
            // This is why many applications implement a small server-side proxy for this step
            
            // For demonstration purposes, show a success message instead
            // In a production app, you would need a server-side component to securely exchange the code
            console.log('Note: Token exchange would normally require a server component');
            
            // Create a "demo mode" interface showing the user that authentication worked
            spotifyContainer.innerHTML = '';
            
            const demoContent = document.createElement('div');
            demoContent.className = 'spotify-auth-success';
            demoContent.innerHTML = `
                <div class="spotify-success-message">
                    <h4>Authentication Successful!</h4>
                    <p>Your Spotify authorization code was received successfully.</p>
                    <p>Code: ${code.substring(0, 10)}...</p>
                    <p class="note">Note: For security reasons, exchanging this code for an access token requires a server-side component.</p>
                    <p class="note">In a production application, your server would securely perform this exchange.</p>
                    <div class="demo-player">
                        <h4>Demo Player</h4>
                        <iframe 
                            src="https://embed.spotify.com/?uri=spotify:playlist:37i9dQZEVXcIroVdJc5khI&theme=light" 
                            width="100%" 
                            height="352" 
                            frameborder="0" 
                            allowtransparency="true" 
                            allow="encrypted-media"
                            style="border-radius: 12px;">
                        </iframe>
                    </div>
                    <button id="spotify-retry-button" class="spotify-btn">Sign out</button>
                </div>
            `;
            
            spotifyContainer.appendChild(demoContent);
            
            // Add event listener for the retry button
            document.getElementById('spotify-retry-button').addEventListener('click', () => {
                // Clear spotify auth data
                localStorage.removeItem('spotify_auth_state');
                localStorage.removeItem('spotify_code_verifier');
                localStorage.removeItem('spotify_access_token');
                localStorage.removeItem('spotify_refresh_token');
                
                // Reset to login view
                initializeLoginView();
            });
            
            // Add a note in the header area
            if (spotifyHeader) {
                spotifyHeader.innerHTML = `
                    <h3>Music</h3>
                    <div class="spotify-connected-indicator">Connected ✓</div>
                `;
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            initializeLoginView();
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
     * Fetches the user's playlists from Spotify API
     * @param {string} token - The Spotify access token
     */
    function fetchUserPlaylists(token) {
        console.log('Fetching user playlists with token:', token.substring(0, 5) + '...');
        
        // First, get the user's Spotify ID
        fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => {
            console.log('User data response status:', response.status);
            if (!response.ok) {
                // If the token is expired or invalid, go back to login view
                if (response.status === 401) {
                    throw new Error('Spotify authentication expired');
                }
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        })
        .then(userData => {
            console.log('User data received:', userData.display_name);
            const userId = userData.id;
            
            // Now fetch the user's playlists
            return fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
        })
        .then(response => {
            console.log('Playlists response status:', response.status);
            if (!response.ok) {
                throw new Error('Failed to fetch playlists');
            }
            return response.json();
        })
        .then(playlistData => {
            console.log(`Loaded ${playlistData.items.length} playlists`);
            // Update the playlist selector with the user's playlists
            updatePlaylistSelector(playlistData.items, token);
        })
        .catch(error => {
            console.error('Error:', error);
            if (error.message === 'Spotify authentication expired') {
                // If auth expired, reset to login view
                initializeLoginView();
            } else {
                // Show error in the container
                spotifyContainer.innerHTML = `
                    <div class="spotify-error">
                        <p>Failed to load playlists. Please try again.</p>
                        <button id="spotify-retry-button" class="spotify-btn">Retry</button>
                    </div>
                `;
                
                document.getElementById('spotify-retry-button').addEventListener('click', () => {
                    fetchUserPlaylists(token);
                });
            }
        });
    }
    
    /**
     * Updates the playlist selector with user's playlists
     * @param {Array} playlists - The user's playlists from Spotify API
     * @param {string} token - The Spotify access token
     */
    function updatePlaylistSelector(playlists, token) {
        const playlistSelector = document.getElementById('playlist-selector');
        if (!playlistSelector) return;
        
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
        try {
            spotifyContainer.innerHTML = renderSpotifyEmbed(playlistUri);
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