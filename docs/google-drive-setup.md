# Google Drive documents setup

The Documents page uses one organization-owned Google account. Resilience users do
not sign in to Google; they upload, browse, create folders, and download through
the application.

## One-time Google setup

1. In Google Cloud Console, create or select a project and enable **Google Drive API**.
2. Configure the OAuth consent screen. Use the organization account that owns the
   `Resilience Montreal Documents Home` folder to authorize the connection.
3. Create an OAuth client of type **Web application**.
4. Add this authorized redirect URI (replace the domain with the deployed app URL):

   ```text
   https://your-app.example.com/api/documents/google/callback
   ```

   For local development, also add `http://localhost:3000/api/documents/google/callback`.
5. Copy the folder ID from the folder URL. It is the value after `/folders/`.

## Environment variables

Set these server-only values in the deployment environment and restart the app:

```text
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY=...
```

Generate the encryption key once and retain it for the lifetime of the deployment:

```sh
openssl rand -base64 32
```

Never rotate or remove this key without reconnecting the Google account: it
encrypts the stored OAuth refresh token.

## Connect the shared account

After the migration has been deployed, an app **Admin** opens Documents and selects
**Connect the shared Google account**. They sign in as the owner of the documents
folder and accept the Drive permission. The app stores only an encrypted refresh
token; users of the Resilience app never receive it.

Apply the database migration through the normal deployment workflow, for example:

```sh
npx prisma migrate deploy
```
