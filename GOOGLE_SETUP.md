# Google Drive Integration Setup

## Steps to configure Google Drive API:

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API

### 2. Create OAuth 2.0 Credentials
1. Go to "Credentials" in the left sidebar
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: your domain URL
5. Copy the Client ID

### 3. Configure Environment Variables
1. Copy the file `.env.local` 
2. Replace `your_google_client_id_here` with your actual Google Client ID
3. Save the file

### 4. Restart Development Server
```bash
npm run dev
# or
pnpm dev
```

### 5. Test the Integration
1. Go to the Notes page
2. Click "Sign in to Google Drive"
3. Complete the OAuth flow
4. Your notes will now sync with Google Drive

## Troubleshooting

- **"Missing required parameter client_id" error**: Make sure you've set the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
- **OAuth error**: Check that your domain is added to authorized origins in Google Cloud Console
- **API not enabled**: Make sure Google Drive API is enabled in your Google Cloud project

## Security Note

Never commit your `.env.local` file to version control. It contains sensitive information.
