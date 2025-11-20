# Google OAuth Setup Guide for StreetSense

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "StreetSense" and click "Create"

## Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API" (or "Google Identity")
3. Click on it and press **Enable**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
3. If prompted, configure the **OAuth consent screen**:
   - Choose **External** user type
   - Fill in:
     - App name: `StreetSense`
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue** through all steps

4. Back to creating OAuth client ID:
   - Application type: **Web application**
   - Name: `StreetSense Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://localhost:5000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000
     http://localhost:5000/api/auth/google
     ```
   - Click **Create**

5. Copy your **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

## Step 4: Configure Environment Variables

### Server (`/server/.env`):
```bash
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
```

### Client (`/client/.env`):
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
```

⚠️ **Important**: Use the **same Client ID** for both server and client!

## Step 5: Install Dependencies

```bash
# In the root directory
cd server
npm install

cd ../client
npm install
```

## Step 6: Test Google Login

1. Start both servers:
   ```bash
   # Terminal 1 - Server
   cd server
   npm start

   # Terminal 2 - Client
   cd client
   npm start
   ```

2. Navigate to http://localhost:3000/auth
3. Click the "Sign in with Google" button
4. Authenticate with your Google account
5. You should be redirected to the map page

## Troubleshooting

### "Google authentication is not configured on the server"
- Make sure `GOOGLE_CLIENT_ID` is set in `server/.env`
- Restart the server after adding the env variable

### "redirect_uri_mismatch" error
- Check that your redirect URIs in Google Console match exactly
- Make sure there are no trailing slashes

### Google button not showing
- Check that `REACT_APP_GOOGLE_CLIENT_ID` is set in `client/.env`
- Restart the React dev server (npm start)
- Check browser console for errors

### "Invalid token" error
- Ensure both client and server use the **same** Client ID
- Check that the Google+ API is enabled

## Production Setup

For production deployment:

1. Update authorized origins in Google Console:
   ```
   https://yourdomain.com
   https://api.yourdomain.com
   ```

2. Update redirect URIs:
   ```
   https://yourdomain.com
   https://api.yourdomain.com/api/auth/google
   ```

3. Set environment variables on your hosting platform

## Security Notes

- Never commit `.env` files with real credentials
- Keep your Client ID public-facing safe (it's meant to be public)
- The Client Secret (if you have one) should NEVER be exposed to the client
- Use HTTPS in production
