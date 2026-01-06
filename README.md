# Discoverify: A Spotify Song Recommender

## Overview

This project is a personalized song recommendation system integrated with Spotify. Users can log in with their Spotify account, and the application will generate a new playlist in their library with song recommendations tailored to their listening habits. The system is built with a Node.js backend for handling Spotify API interactions and user requests, and a Python Flask API for powering the machine learning recommendation model.

## Features

- **Spotify Authentication:** Secure user login via Spotify OAuth2.
- **Personalized Recommendations:** Generates song recommendations based on the user's top tracks.
- **Automatic Playlist Creation:** Creates a new playlist named "Song Recommender Picks" directly in the user's Spotify library.
- **Machine Learning Model:** Utilizes a Collaborative Filtering (SVD + KNN) model for intelligent recommendations.
- **Modular Architecture:** Separates backend logic (Node.js) from ML model serving (Python Flask).

## Architecture

The application follows a microservice-like architecture:

- **Frontend:** A basic HTML page served by the Node.js backend.
- **Backend (Node.js/Express):** Handles all client-side requests, manages Spotify API authentication and interactions (fetching user data, creating playlists), and communicates with the Python ML API.
- **Machine Learning API (Python/Flask):** Serves the trained recommendation model. It receives user top track URIs from the Node.js backend, generates recommendations using the model, and returns recommended track URIs.

## Setup (Local Development)

### Prerequisites

- Node.js (LTS version recommended)
- Python 3.8+
- npm (comes with Node.js)
- pip (comes with Python)
- Git

### 1. Spotify Developer Setup

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2.  Log in and click "Create an App".
3.  Fill in the details. The "Redirect URI" is crucial. For local development, add:
    - `http://127.0.0.1:3000/callback`
4.  Once created, you will get a **Client ID** and a **Client Secret**. Keep these handy.

### 2. Clone the Repository

```bash
git clone https://github.com/Pabz-10/Discoverify.git
cd Discoverify
```

### 3. Backend (Node.js) Setup

1.  Navigate into the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `backend` directory (copy from `.env.example`):
    ```bash
    cp .env.example .env
    ```
4.  Open the newly created `.env` file and fill in your Spotify credentials and local URLs:
    ```
    PORT=3000
    SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID
    SPOTIFY_CLIENT_SECRET=YOUR_SPOTIFY_CLIENT_SECRET
    REDIRECT_URI=http://127.0.0.1:3000/callback
    PYTHON_API_URL=http://127.0.0.1:5000/predict
    ```
    (Replace `YOUR_SPOTIFY_CLIENT_ID` and `YOUR_SPOTIFY_CLIENT_SECRET` with your actual credentials).

### 4. Machine Learning Model API (Python) Setup

1.  Navigate into the `model` directory (from the project root):
    ```bash
    cd ../model
    ```
2.  Create and activate a Python virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Model Training & Saving:**
    - Open `model/notebooks/spotify_recommendation_baseline.ipynb` in your Jupyter environment (e.g., VS Code or Google Colab).
    - **Download the Spotify Million Playlist Dataset** from [AIcrowd](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge). Place the unzipped `data` folder (containing the JSON slices) anywhere on your system.
    - Update the `data_path` variable in the notebook to point to the absolute path of this `data` folder.
    - Run the notebook cells to train your model and save the `svd_model.pkl`, `knn_model.pkl`, `track_to_idx.pkl`, and `idx_to_track.pkl` files.
    - **Move these four `.pkl` files** from `model/notebooks/` to `model/` (alongside `app.py`).

## Running the Application (Local)

You need to run both the Python API and the Node.js backend simultaneously.

### 1. Start the Python ML API

1.  Open a terminal and navigate to the `model` directory.
2.  Activate your virtual environment: `source venv/bin/activate`
3.  Start the Flask API:
    ```bash
    python app.py
    ```
    (It should start on `http://127.0.0.1:5000/`)

### 2. Start the Node.js Backend

1.  Open a **second terminal** and navigate to the `backend` directory.
2.  Start the Node.js server:
    ```bash
    npm start
    ```
    (It should start on `http://localhost:3000/`)

### 3. Use the Application

1.  Open your web browser and go to `http://127.0.0.1:3000`.
2.  Click "Login with Spotify" and authorize the application.
3.  You will be redirected to a success page with a button to open your new personalized Spotify playlist.

## Deployment to Render

This application is designed for deployment on Render.com as two separate "Web Services" communicating over Render's internal network.

### 1. Python Model API Service

- **Service Type:** Web Service
- **Runtime:** Python
- **Root Directory:** `model`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`
- **Environment Variables:** None needed initially.
- **Important:** Note down the public `.onrender.com` URL provided by Render for this service (e.g., `https://my-python-api.onrender.com`). You will need this for the Node.js backend.

### 2. Node.js Backend Service

- **Service Type:** Web Service
- **Runtime:** Node
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** Add the following in Render's dashboard:
  - `SPOTIFY_CLIENT_ID`: Your Spotify Client ID.
  - `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret.
  - `PYTHON_API_URL`: The URL of your deployed Python service, with `/predict` appended (e.g., `https://my-python-api.onrender.com/predict`).
  - `REDIRECT_URI`: The public URL of _this_ Node.js service, with `/callback` appended (e.g., `https://my-node-backend.onrender.com/callback`).

### 3. Final Step: Update Spotify Developer Dashboard

- After deploying your Node.js backend service, go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Edit your application's settings and add the `REDIRECT_URI` of your deployed Node.js service (e.g., `https://my-node-backend.onrender.com/callback`) to your list of approved Redirect URIs.

This will ensure the authentication flow works correctly in production.
