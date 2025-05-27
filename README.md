# Calendar App with Spotify Integration

A web-based calendar application that includes Spotify integration for playing music while managing your tasks and events.

## Spotify Integration Setup

The app includes integration with Spotify to allow users to connect their accounts and play music directly within the calendar interface.

### Setting Up Spotify API

1. **Spotify Developer Account**:
   - The app is already configured with a client ID (`82f6edcd7d0648eba0f0a297c8c2c197`)
   - If you want to use your own client ID, replace it in `spotify.js`

2. **Redirect URI Setup - IMPORTANT**:
   - Open your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Select your app
   - Click "Edit Settings"
   - Under "Redirect URIs", add this **exact URI**: `https://abraham77967.github.io/Planify-test/`
   - Include the trailing slash as shown above
   - Click "Save" to update your app settings

3. **Understanding the 404 Error**:
   - If you click "Connect Spotify" and see a 404 GitHub Pages error:
   - This happens because Spotify is redirecting to the wrong URL
   - The solution is to ensure the redirect URI in your Spotify Dashboard matches exactly with the URI in the code
   - The current redirect URI is set to: `https://abraham77967.github.io/Planify-test/`

### Testing the Application

For testing the Spotify integration:

1. **Deploy to GitHub Pages**:
   - Push your code to GitHub
   - Deploy to GitHub Pages from the `spotify-integration` branch
   - The app will be accessible at `https://abraham77967.github.io/Planify-test/`
   - Make sure your GitHub Pages is actually active and working

2. **Local Development**:
   - For local testing, you would need to:
     - Run a local HTTPS server (not just HTTP)
     - Add the local HTTPS URL to your Spotify Dashboard
     - Update the redirect URI in the code
   - For simplicity, it's recommended to test the Spotify integration using GitHub Pages

```bash
# To run a local server (Spotify integration won't work without additional setup)
http-server -p 8080
```

## Features

- Monthly calendar view
- Task management with checklists
- Goal tracking
- Spotify music integration
- Responsive design for various screen sizes

## Technologies

- HTML5, CSS3, JavaScript
- Spotify Web API and Web Playback SDK
