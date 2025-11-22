require("dotenv").config();
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Define the scopes for Spotify authorization.
// These scopes determine what permissions the app is asking from the user.
const scopes = ["user-top-read"];

// Initialize Spotify API client with credentials and redirect URI.
const spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectUri: "http://127.0.0.1:3000/callback",
});

// Serve static files from the 'public' directory.
app.use(express.static(path.join(__dirname, "public")));

// Redirects the user to the Spotify authorization page.
app.get("/login", (req, res) => {
	res.redirect(spotifyApi.createAuthorizeURL(scopes, null, true));
});

// Handles the callback from Spotify after user authorization.
app.get("/callback", (req, res) => {
	const error = req.query.error;
	const code = req.query.code;

	if (error) {
		console.error("Callback Error:", error);
		res.send(`Callback Error: ${error}`);
		return;
	}

	// Exchange the authorization code for an access token and refresh token.
	spotifyApi
		.authorizationCodeGrant(code)
		.then((data) => {
			const access_token = data.body["access_token"];
			const refresh_token = data.body["refresh_token"];
			const expires_in = data.body["expires_in"];

			// Set the tokens on the API object to use in subsequent calls
			spotifyApi.setAccessToken(access_token);
			spotifyApi.setRefreshToken(refresh_token);

			console.log("access_token:", access_token);
			console.log("refresh_token:", refresh_token);
			console.log(
				`Successfully retrieved access token. Expires in ${expires_in} s.`
			);

			// Redirect to the recommendations endpoint immediately after successful login.
			res.redirect("/recommendations");
			// Periodically refresh the access token.
			setInterval(async () => {
				const data = await spotifyApi.refreshAccessToken();
				const access_token = data.body["access_token"];
				console.log("The access token has been refreshed!");
				spotifyApi.setAccessToken(access_token);
			}, (expires_in / 2) * 1000);
		})
		.catch((error) => {
			console.error("Error getting Tokens:", error);
			res.send(`Error getting Tokens: ${error}`);
		});
});

const fetch = require("node-fetch");

// ... (existing code) ...

// Endpoint to generate recommendations based on user's top artists' genres.
app.get('/recommendations', async (req, res) => {
  try {
    const accessToken = spotifyApi.getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // 1. Get User's Top Artists to extract genres
    const topArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!topArtistsResponse.ok) throw new Error('Failed to fetch top artists');
    const topArtists = await topArtistsResponse.json();

    if (!topArtists.items || topArtists.items.length === 0) {
      console.log("No top artists found for user.");
      return res.json({ recommendations: [] });
    }

    // 2. Select Seed Genres from the artists
    const allGenres = topArtists.items.flatMap(artist => artist.genres);
    const uniqueGenres = [...new Set(allGenres)];
    
    // Shuffle and pick up to 2 genres for variety
    const seedGenres = uniqueGenres.sort(() => 0.5 - Math.random()).slice(0, 2);

    if (seedGenres.length === 0) {
      console.log("Could not find any genres from the user's top artists.");
      return res.json({ recommendations: [] });
    }
    console.log("Using seed genres:", seedGenres);

    // 3. Search for Tracks by Genre
    const searchQuery = seedGenres.map(genre => `genre:"${genre}"`).join(' ');
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!searchResponse.ok) throw new Error('Failed to search for tracks');
    
    const searchResult = await searchResponse.json();
    const recommendations = searchResult.tracks ? searchResult.tracks.items : [];
    
    console.log("Total recommendations found:", recommendations.length);
    
    res.json({ recommendations });

  } catch (err) {
    console.error('Something went wrong in /recommendations endpoint!', err);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// Starts the Express server.
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
