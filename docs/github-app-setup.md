# GitHub App Setup Guide for LeetBranch

To enable true per-user synchronization to GitHub, LeetBranch utilizes a GitHub App. This architecture allows users to securely authorize LeetBranch to push code to specific repositories without ever handing over their raw passwords or personal access tokens (PATs).

Follow these instructions to create your GitHub App.

## Step 1: Create the GitHub App

1. Go to your GitHub account settings: **Settings > Developer settings > GitHub Apps**.
2. Click **New GitHub App**.
3. **GitHub App name**: `LeetBranch (Your Name)` or similar.
4. **Homepage URL**: `http://localhost:3000` (Update to your production domain later).
5. **Callback URL**: `http://localhost:8000/api/v1/integrations/github/callback` (Update to your FastAPI production domain later).
6. **Expire user authorization tokens**: Check this box for added security.
7. **Request user authorization (OAuth) during installation**: Check this box so the app immediately authenticates the user upon installation.
8. **Webhook URL**: You can leave this blank and disable webhooks for now, as LeetBranch does not currently rely on GitHub Webhooks. (Uncheck "Active").

## Step 2: Set Permissions

Under the **Repository permissions** section, grant the following minimum permissions:

- **Contents**: `Read and write` (Required to read existing files and push new Markdown files).
- **Metadata**: `Read-only` (Mandatory default permission).

Do NOT grant any Account or Organization permissions unless specifically required in the future.

## Step 3: Where can this GitHub App be installed?

Select **Any account** if you plan to allow multiple users to install this on their personal GitHub accounts. If it's strictly for your own use, select **Only on this account**.

Click **Create GitHub App**.

## Step 4: Generate a Private Key

1. Scroll down on the general settings page for your newly created App.
2. Under **Private keys**, click **Generate a private key**.
3. A `.pem` file will be downloaded to your machine. **KEEP THIS SAFE**.

## Step 5: Configure the Backend Environment

You now need to configure the FastAPI backend with the details of your new App.
Open `apps/api/.env` and add the following keys:

```env
GITHUB_APP_ID="<Your App ID, found at the top of the general settings page>"
GITHUB_APP_CLIENT_ID="<Your Client ID, found on the general settings page>"
GITHUB_APP_CLIENT_SECRET="<Click 'Generate a new client secret' and paste here>"

# Copy the ENTIRE contents of the .pem file you downloaded, including the BEGIN and END tags.
# In a .env file, replace true line breaks with literal \n characters if required by your parser, 
# or wrap the entire key in quotes if supported.
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQ...\n-----END RSA PRIVATE KEY-----"
```

## Step 6: Installation Flow

Once the `.env` is updated and the server restarts, users navigating to the dashboard's "Integrations" section will click "Connect GitHub", which redirects them to install the App on their repository. LeetBranch will then use dynamic, short-lived tokens to sync their code securely!
