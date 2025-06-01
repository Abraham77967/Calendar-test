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
    // NOTE: You must register your app at https://developer.spotify.com/dashboard/
    // and replace these values with your own client ID and redirect URI
    const clientId = 'YOUR_SPOTIFY_CLIENT_ID'; // Replace with your Spotify Client ID
    const redirectUri = window.location.origin; // The URL to redirect back to after authentication
    
    // Scopes define the permissions your app is requesting
    const scopes = [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-read-collaborative'
    ];

    // Generate a random state value for security
    const generateRandomString = length => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
    
    // State is used to prevent CSRF attacks
    const state = generateRandomString(16);
    
    // Get access token from URL if present (after redirect from Spotify)
    const getHashParams = () => {
        const hashParams = {};
        const hash = window.location.hash.substring(1);
        const params = hash.split('&');
        
        for (let i = 0; i < params.length; i++) {
            const pair = params[i].split('=');
            hashParams[pair[0]] = decodeURIComponent(pair[1]);
        }
        
        return hashParams;
    };
    
    // Check if we're returning from Spotify authentication
    const params = getHashParams();
    const accessToken = params.access_token;
    const receivedState = params.state;
    
    // Clear the hash fragment from the URL
    if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize the widget based on authentication status
    if (accessToken && receivedState === localStorage.getItem('spotify_auth_state')) {
        // User is authenticated with Spotify
        initializeAuthenticatedView(accessToken);
    } else {
        // User is not authenticated, show login button
        initializeLoginView();
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
        document.getElementById('spotify-login-button').addEventListener('click', () => {
            // Save state in localStorage to verify when we return
            localStorage.setItem('spotify_auth_state', state);
            
            // Redirect to Spotify authorization page
            const authorizeUrl = 'https://accounts.spotify.com/authorize?' +
                'client_id=' + clientId +
                '&response_type=token' +
                '&redirect_uri=' + encodeURIComponent(redirectUri) +
                '&scope=' + encodeURIComponent(scopes.join(' ')) +
                '&state=' + state +
                '&show_dialog=true';
            
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
            localStorage.removeItem('spotify_access_token');
            
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
        // First, get the user's Spotify ID
        fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => {
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
            const userId = userData.id;
            
            // Now fetch the user's playlists
            return fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch playlists');
            }
            return response.json();
        })
        .then(playlistData => {
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