from flask import Flask, request, jsonify
import joblib

# Create the Flask application
app = Flask(__name__)

# --- Placeholder: Load your trained model and other assets ---
# In a real scenario, you would load your trained model and any necessary mappings here.
# For example:
# model = joblib.load('path/to/your/trained_model.pkl')
# track_to_idx = joblib.load('path/to/your/track_to_idx.pkl')
# print("Model and assets loaded.")
# -------------------------------------------------------------

@app.route('/predict', methods=['POST'])
def predict():
    """
    Receives a list of track URIs and returns a list of recommended track URIs.
    """
    # Get the JSON data from the request
    data = request.get_json()

    if not data or 'track_uris' not in data:
        return jsonify({"error": "Invalid input. 'track_uris' key is required."}, 400)

    input_tracks = data['track_uris']
    
    # --- This is the placeholder logic ---
    # It prints the input it received and returns a fixed list of dummy recommendations.
    # ** ACTION REQUIRED: Replace this with your actual model prediction logic. **
    
    print(f"Received {len(input_tracks)} tracks for prediction:")
    for track in input_tracks:
        print(f" - {track}")

    # Your actual logic would look something like this:
    # recommendations = model.predict(input_tracks) 
    
    # Dummy recommendations for testing purposes
    dummy_recommendations = [
        "spotify:track:4iV5W9uYEdYUVa79Axb7Rh", # Dummy track 1 (Hey Ya! - OutKast)
        "spotify:track:1BxfuYhYUQhGUa7b1A2u62", # Dummy track 2 (Take On Me - a-ha)
        "spotify:track:7oK9VyNzrYvRFo7nQEYkWN"  # Dummy track 3 (Mr. Brightside - The Killers)
    ]
    # ------------------------------------

    # Return the recommendations as a JSON response
    return jsonify({"recommendations": dummy_recommendations})

if __name__ == '__main__':
    # Runs the Flask server on port 5000
    app.run(debug=True, port=5000)
