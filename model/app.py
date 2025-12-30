from flask import Flask, request, jsonify
import joblib
import numpy as np

# Create the Flask application
app = Flask(__name__)

# --- Load the trained model and all necessary assets ---
# This code runs only once when the server starts up.
print("Loading model and assets...")
try:
    # These .pkl files should be in the same directory as this app.py file.
    svd_model = joblib.load('svd_model.pkl')
    knn_model = joblib.load('knn_model.pkl')
    track_to_idx = joblib.load('track_to_idx.pkl')
    idx_to_track = joblib.load('idx_to_track.pkl')
    # We need the track embeddings from the SVD model to calculate playlist vectors.
    track_embeddings = svd_model.components_.T
    print("Model and assets loaded successfully.")
except FileNotFoundError as e:
    print(f"Error loading model files: {e}")
    print("Please make sure svd_model.pkl, knn_model.pkl, track_to_idx.pkl, and idx_to_track.pkl are in the '/model' directory.")
    svd_model = knn_model = track_to_idx = idx_to_track = track_embeddings = None
# ---------------------------------------------------------

@app.route('/predict', methods=['POST'])
def predict():
    """
    Receives a list of track URIs and returns a list of recommended track URIs
    based on the trained model.
    """
    if not knn_model:
        return jsonify({"error": "Model not loaded. Please check server logs."}), 500

    # Get the JSON data from the request body.
    data = request.get_json()

    if not data or 'track_uris' not in data:
        return jsonify({"error": "Invalid input. 'track_uris' key is required."}), 400

    input_tracks = data['track_uris']
    print(f"Received {len(input_tracks)} tracks for prediction.")

    # --- Real Model Prediction Logic ---
    # Convert the input Spotify URIs to our internal track indices.
    # We ignore any tracks that weren't in our training data.
    input_track_indices = [track_to_idx[uri] for uri in input_tracks if uri in track_to_idx]

    if not input_track_indices:
        print("Warning: None of the input tracks were found in the model's vocabulary.")
        return jsonify({"recommendations": []})

    # To represent the user's taste, we calculate the average vector of all their input tracks' embeddings.
    playlist_vector = np.mean(track_embeddings[input_track_indices], axis=0).reshape(1, -1)

    # Use the loaded KNN model to find the songs closest to the user's average taste vector.
    # We ask for k + number of input tracks because some results will be the input tracks themselves.
    k = 10
    distances, indices = knn_model.kneighbors(playlist_vector, n_neighbors=k + len(input_track_indices))
    
    recommendations = []
    # Loop through the results from KNN
    for idx in indices.flatten():
        # Convert the recommended track index back to a Spotify URI.
        rec_uri = idx_to_track[idx]
        # Add to recommendations if it's not one of the songs the user already has.
        if rec_uri not in input_tracks:
            recommendations.append(rec_uri)
    
    # Return the top 'k' unique recommendations.
    final_recommendations = recommendations[:k]
    # ------------------------------------

    print(f"Returning {len(final_recommendations)} recommendations.")
    # Return the recommendations as a JSON response.
    return jsonify({"recommendations": final_recommendations})

if __name__ == '__main__':
    # Runs the Flask server on port 5000.
    app.run(debug=True, port=5000)