require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the scopes for Spotify authorization.
// These scopes determine what permissions the app is asking from the user.
const scopes = [
  'ugc-image-upload',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  'user-read-email',
  'user-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read',
  'user-top-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify'
];

// Initialize Spotify API client with credentials and redirect URI.
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'http://127.0.0.1:3000/callback'
});

// Serve static files from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

// Redirects the user to the Spotify authorization page.
app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
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

    // For a real app, you'd save these tokens to a database associated with the user.
    // For this example, we'll just redirect to a success page.
    res.send('Success! You can now use the API.');

    // Periodically refresh the access token.
    setInterval(async () => {
      const data = await spotifyApi.refreshAccessToken();
      const access_token = data.body['access_token'];
      console.log('The access token has been refreshed!');
      spotifyApi.setAccessToken(access_token);
    }, expires_in / 2 * 1000);

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send(`Error getting Tokens: ${error}`);
  });
});

// Starts the Express server.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
