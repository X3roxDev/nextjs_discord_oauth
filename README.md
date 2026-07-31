# X3roxDev_oauth

A simple Discord login demo built with Next.js. It is meant for debugging and learning how OAuth redirects work, not for production authentication.

The app lets a user sign in with Discord, fetches their Discord profile, stores the demo session in `localStorage`, keeps the user signed in after refresh, and clears everything on logout.

## Features

- Discord login with the OAuth implicit flow
- No database and no backend session storage
- Local refresh persistence with `localStorage`
- Clean logout that clears the local demo session
- Visible login/logout flow log for debugging
- Clear missing-config warning when the Discord client ID is not set
- Modern responsive UI with a profile/details panel

## Important Note

This project intentionally stores the Discord access token in the browser so the flow is easy to inspect. That is fine for a local learning tool, but do not use this pattern for production authentication.

## Requirements

- Node.js
- pnpm
- A Discord application client ID

## Discord Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application.
3. Copy the application client ID.
4. Open `OAuth2`.
5. Add this redirect URL:

```text
http://localhost:3000/auth/callback
```

The redirect URL must match exactly. If you run the app on a different port or hostname, add that exact callback URL in Discord too.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Set your Discord client ID:

```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id_here
```

Start the dev server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
pnpm dev
```

Runs the local Next.js development server.

```bash
pnpm build
```

Builds the app for production.

```bash
pnpm start
```

Starts the production build after `pnpm build`.

```bash
pnpm lint
```

Runs ESLint.

## How It Works

1. The home page checks for `NEXT_PUBLIC_DISCORD_CLIENT_ID`.
2. Login creates an OAuth `state` value and redirects to Discord.
3. Discord redirects back to `/auth/callback` with an access token in the URL hash.
4. The callback page validates `state`, fetches `https://discord.com/api/v10/users/@me`, and stores the session in `localStorage`.
5. The home page reads the saved session after refresh.
6. Logout removes the saved session and OAuth state from `localStorage`.

## Troubleshooting

If the login button is disabled, check that `.env.local` exists and contains `NEXT_PUBLIC_DISCORD_CLIENT_ID`.

If Discord says the redirect URI is invalid, make sure the Discord Developer Portal contains exactly:

```text
http://localhost:3000/auth/callback
```

If you change `.env.local`, restart the dev server so Next.js can load the new value.

## Project Structure

```text
app/
  auth/callback/page.tsx  Discord OAuth callback handler
  globals.css             App styling
  layout.tsx              App metadata and root layout
  page.tsx                Main login demo UI
```
