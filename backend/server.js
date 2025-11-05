require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const app = express();

const PORT = process.env.PORT || 3000;

// Initialize Spotify API client with credentials from environment variables.
// These credentials are used for server-to-server communication with Spotify.
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Defines an API endpoint to obtain an access token from Spotify using the Client Credentials Flow.
// This token is necessary for making requests to the Spotify Web API that do not require user context.
app.get('/spotify/token', (req, res) => {
  // Request an access token from Spotify.
  spotifyApi.clientCredentialsGrant().then(
    (data) => {
      // Log and send the access token and its expiration time.
      console.log('The access token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);

      // Set the access token on the spotifyApi object for subsequent requests.
      spotifyApi.setAccessToken(data.body['access_token']);
      res.json({ accessToken: data.body['access_token'], expiresIn: data.body['expires_in'] });
    },
    (err) => {
      // Handle any errors during the token retrieval process.
      console.log('Something went wrong when retrieving an access token', err);
      res.status(500).json({ error: 'Failed to get access token' });
    }
  );
});

app.get('/', (req, res) => {
  // Handles GET requests to the root URL.
  // This is a basic endpoint to confirm the server is running.
  res.send('Song Recommendation API');
});

// Starts the Express server and listens for incoming requests on the specified port.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
