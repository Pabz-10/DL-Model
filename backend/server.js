require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the scopes for Spotify authorization.
// These scopes determine what permissions the app is asking from the user.
const scopes = [
  'user-top-read',
  'playlist-modify-public'
];

// Initialize Spotify API client with credentials and redirect URI.
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// Serve static files from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

// Redirects the user to the Spotify authorization page.
app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes, null, true));
});

// Handles the callback from Spotify after user authorization.
app.get('/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  // Exchange the authorization code for an access token and refresh token.
  spotifyApi.authorizationCodeGrant(code).then(data => {
    const access_token = data.body['access_token'];
    const refresh_token = data.body['refresh_token'];
    const expires_in = data.body['expires_in'];

    // Set the tokens on the API object to use in subsequent calls
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    console.log('access_token:', access_token);
    console.log('refresh_token:', refresh_token);
    console.log(`Successfully retrieved access token. Expires in ${expires_in} s.`);

    // Redirect to the recommendations endpoint immediately after successful login.
    res.redirect('/recommendations');
    // Periodically refresh the access token.
    setInterval(async () => {
      const data = await spotifyApi.refreshAccessToken();
      const access_token = data.body['access_token'];
      console.log('The access token has been refreshed!');
      spotifyApi.setAccessToken(access_token);
    }, (expires_in / 2) * 1000);

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send(`Error getting Tokens: ${error}`);
  });
});

app.get('/recommendations', async (req, res) => {
  try {
    const accessToken = spotifyApi.getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // --- Step 1: Get User's Top Tracks to send to the model ---
    const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=20', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!topTracksResponse.ok) throw new Error('Failed to fetch user top tracks');
    const topTracks = await topTracksResponse.json();
    const topTrackUris = topTracks.items.map(track => track.uri);

    if (topTrackUris.length === 0) {
      return res.json({ recommendations: [] });
    }

    // --- Step 2: Call the Python Model API ---
    console.log('Sending user top tracks to Python model API...');
    const modelResponse = await fetch(process.env.MODEL_API_URL + '/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_uris: topTrackUris })
    });

    if (!modelResponse.ok) {
      console.error('Python model API returned an error:', await modelResponse.text());
      throw new Error('Failed to get recommendations from model API');
    }
    
    const modelResult = await modelResponse.json();
    const recommendedUris = modelResult.recommendations;
    console.log('Received recommendations from model:', recommendedUris);

    if (recommendedUris.length === 0) {
      return res.json({ message: "No recommendations returned from the model." });
    }

    // --- Step 3: Create a new playlist and add tracks ---
    // First, get the current user's ID
    const meResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!meResponse.ok) throw new Error('Failed to get user profile');
    const me = await meResponse.json();
    const userId = me.id;

    // Create a new playlist
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Song Recommender Picks",
        description: "Songs recommended for you by our model.",
        public: true
      })
    });
    if (!createPlaylistResponse.ok) throw new Error('Failed to create playlist');
    const newPlaylist = await createPlaylistResponse.json();

    // Add the recommended tracks to the new playlist
    await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: recommendedUris })
    });
    
    // --- Step 4: Respond with a success page and a link to the playlist ---
    const playlistUrl = newPlaylist.external_urls.spotify;
    console.log('Successfully created playlist:', playlistUrl);
    
    // Send a success page with a button to open the playlist.
    // This is better than a script because it avoids pop-up blockers.
    res.send(`
        <html>
            <head>
                <title>Playlist Ready!</title>
                <link rel="stylesheet" href="style.css">
            </head>
            <body>
                <div class="container">
                    <h1>Your "Song Recommender Picks" playlist is ready!</h1>
                    <p>Click the button below to open your new playlist in Spotify.</p>
                    <a href="${playlistUrl}" target="_blank" class="btn">Open Playlist</a>
                </div>
            </body>
        </html>
    `);

  } catch (err) {
    console.error('Something went wrong in /recommendations endpoint!', err);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// Starts the Express server.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});