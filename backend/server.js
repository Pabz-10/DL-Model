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

// Endpoint to fetch user's top tracks and their audio features.
app.get("/recommendations", async (req, res) => {
	try {
		const accessToken = spotifyApi.getAccessToken();
		if (!accessToken) {
			return res.status(401).json({ error: "User not authenticated" });
		}

		console.log("Manually fetching top tracks with token:", accessToken);

		// Bypassing the library to make a direct API call
		const topTracksResponse = await fetch(
			"https://api.spotify.com/v1/me/top/tracks?limit=50",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!topTracksResponse.ok) {
			const errorBody = await topTracksResponse.json();
			console.error("Direct API call failed!", errorBody);
			return res.status(topTracksResponse.status).json(errorBody);
		}

		const topTracks = await topTracksResponse.json();
		const trackIds = topTracks.items.map((track) => track.id);

		if (trackIds.length === 0) {
			return res.json({ message: "No top tracks found for the user." });
		}

    // We can still use the library for the next call, as it's a different endpoint
    const audioFeaturesResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!audioFeaturesResponse.ok) {
      const errorBody = await audioFeaturesResponse.json();
      console.error('Direct API call for audio features failed!', errorBody);
      return res.status(audioFeaturesResponse.status).json(errorBody);
    }

    const audioFeatures = await audioFeaturesResponse.json();

    const recommendationsData = {
      topTracks: topTracks.items,
      audioFeatures: audioFeatures.audio_features
    };

		res.json(recommendationsData);
	} catch (err) {
		console.error("Something went wrong in /recommendations endpoint!", err);
		res.status(500).json({ error: "Something went wrong!" });
	}
});

// Starts the Express server.
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
