# Planora Spotify Integration

This integration allows users to connect their Spotify accounts to the Planora calendar app and play their playlists.

## Setup Instructions

### Prerequisites

- A Spotify Developer account
- Node.js and npm installed
- Netlify account (free tier works fine)

### Spotify App Configuration

1. Create a Spotify app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Set the redirect URI to your deployed site URL (e.g., `https://your-site-name.netlify.app`)
3. Note your Client ID and Client Secret

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with:
   ```
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

3. Start the local development server:
   ```
   npm run dev
   ```

### Deployment to Netlify

1. Install Netlify CLI globally (if not already installed):
   ```
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```
   netlify login
   ```

3. Initialize a new Netlify site:
   ```
   netlify init
   ```

4. Set environment variables in the Netlify dashboard:
   - Go to Site settings > Build & deploy > Environment
   - Add `SPOTIFY_CLIENT_SECRET` with your Spotify client secret

5. Deploy to Netlify:
   ```
   netlify deploy --prod
   ```

6. Update your Spotify app's redirect URI in the Spotify Developer Dashboard to match your Netlify site URL.

## How It Works

1. The user clicks "Connect to Spotify"
2. They authenticate with Spotify using OAuth 2.0 with PKCE
3. Spotify redirects back to our app with an authorization code
4. Our serverless function exchanges the code for access and refresh tokens
5. The app uses the tokens to fetch and display the user's playlists
6. When tokens expire, they are automatically refreshed

## Files Structure

- `spotify-embed.js`: Main frontend integration code
- `netlify/functions/spotify-token.js`: Serverless function for token exchange
- `netlify/functions/spotify-refresh.js`: Serverless function for token refresh