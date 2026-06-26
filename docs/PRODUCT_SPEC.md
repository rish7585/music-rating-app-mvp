# Product Spec: Music Social App

## One-liner

A mobile-first music app that combines Beli-style personal rankings with Airbuds-style friend activity.

## Product thesis

People do not only want to know what they listened to. They want to know what their friends actually love, what they are replaying, what they think is overrated, and how their own taste compares.

## MVP

The MVP should focus on social music identity, not web dashboards.

### Must-have flows

1. Rate a song quickly
2. Assign the song to a tier
3. Build a ranked personal list
4. View friend activity
5. React/comment on friend ratings
6. See a profile with top songs and taste identity

### Later flows

1. Spotify import
2. Apple Music import
3. Push notifications
4. Taste compatibility
5. Group rankings
6. Shareable recap cards

## Data objects

- User
- Track
- Artist
- Album
- Rating
- Ranking
- FriendRequest
- Friendship
- Activity
- Reaction
- Comment
- TasteCompatibility

## Not in scope right now

- Next.js web app
- Server-rendered dashboards
- Prisma SQLite local web backend
- Web-only auth flow
