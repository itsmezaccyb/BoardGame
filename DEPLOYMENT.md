# Chameleon Game - Deployment Guide

## Build Status ✅

The project has been successfully built and is ready for deployment.

**Build Output Location:** `.next/`

## Prerequisites for Deployment

1. **Node.js**: v18+ (most hosting providers have this)
2. **Environment Variables**: Already configured in `.env`
3. **Supabase Account**: Already configured and connected

## Environment Variables Required

The following environment variables are needed for the deployed application:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pknhqumjnopijkxlkxfz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_QgcrmY99rki0gLTDVGZBvg_XUoZb7ri
SUPABASE_SERVICE_ROLE_KEY=sb_secret_feVmUzRgo6u_UNoLSQujyQ_iGEEOBum
```

These are already in your `.env` file and should be added to your hosting provider's environment variables.

## Deployment Options

### Option 1: Vercel (Recommended - Official Next.js Platform)

1. **Push to Git**
   ```bash
   git add .
   git commit -m "Deploy Chameleon game"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to vercel.com and sign in/create account
   - Click "New Project"
   - Import your Git repository
   - Vercel will auto-detect Next.js configuration

3. **Add Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add the three Supabase variables from above
   - Deploy

### Option 2: Docker / VPS

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY .next ./
   COPY public ./public
   COPY package.json ./
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **Build and Run**
   ```bash
   docker build -t chameleon-game .
   docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=... chameleon-game
   ```

### Option 3: Railway, Netlify, or Other Hosting

Most platforms support Next.js applications. Simply:

1. Connect your Git repository
2. Add the environment variables
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Deploy

## Database Setup

The Supabase database should already be configured with:
- 6 tables for Chameleon game (sessions, players, word lists, words, image lists, images)
- RLS policies configured
- Default word lists seeded

To verify the database is set up:
```bash
npm run seed-lists
```

## Features

### Chameleon Game Components

- **Display Board View** (`/chameleon/table`): Shared 4x4 grid display with jumbo view toggle
- **Player View** (`/chameleon/player`): Personal view showing role and leader controls
- **Lobby** (`/chameleon`): Join, create display boards, manage word/image lists

### Key Endpoints

- `GET /api/chameleon/game-sessions` - Get session data
- `POST /api/chameleon/game-sessions` - Create new game
- `GET /api/chameleon/players` - Get players in session
- `POST /api/chameleon/players` - Join game
- `POST /api/chameleon/start-round` - Start a new round
- `GET /api/chameleon/word-lists` - Get available word lists
- `GET /api/chameleon/image-lists` - Get available image lists

## Known Limitations

1. **Pre-rendering Warnings**: Pages with `useSearchParams()` will show warnings during build (doesn't affect runtime)
2. **API Warnings**: Some dynamic API routes use `request.url` (needed for proper functionality)

These are expected and don't impact the application.

## Performance Notes

- Grid cards: 2.5 inches (normal view) or responsive (jumbo view)
- Real-time sync: 1-second polling for game state
- Supports up to 8 players per game
- 4x4 grid (16 items) per game
- Seeded randomness for reproducible boards

## Troubleshooting

### Display board shows "Waiting for game to start"
- This is normal before a leader starts the first round
- Leader must join as a player and click "Start Game"

### Word lists not appearing
- Check database connection in `.env`
- Run migration: `npm run seed-lists`
- Verify Supabase tables exist

### Real-time updates not syncing
- Check browser console for API errors
- Verify Supabase credentials in `.env`
- Check RLS policies are enabled

## Commit & Deploy

To deploy, commit and push this version:

```bash
git add .
git commit -m "Deploy Chameleon game with refined UI"
git push origin main
```

Then follow your chosen hosting platform's deployment process above.

---

**Last Built:** 2025-12-23  
**Build Size:** ~5-10MB (varies by node_modules optimization)  
**Estimated Deploy Time:** 2-5 minutes (depending on platform)
