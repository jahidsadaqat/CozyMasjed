# Deen Rooms

Deen Rooms is a cozy, iOS-first 3D room decorator built with Expo SDK 57, React Native, Three.js and React Three Fiber. The MVP lets a player style a procedural prayer room, place Islamic decor on an 8×8 grid or either wall, edit objects, undo/redo, and save or share a room image.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```sh
npm install
npx expo start --clear
```

Scan the QR code with Expo Go on an iPhone, or use an iOS development build. A development/native rebuild is required after changing the media-library permission configuration in `app.json`.

## Useful checks

```sh
npm run typecheck
npx expo-doctor
npx expo export --platform ios
```

## Project map

- `src/components/room/` — procedural room, Three.js background, placed models and touch controller
- `src/components/ui/` — editor controls, catalog/style sheets and first-launch guide
- `src/catalog/` — the 10 registered GLB assets and placement metadata
- `src/domain/grid.ts` — grid conversion, footprints, wall snapping and collision rules
- `src/store/` — Zustand room/history state plus validated AsyncStorage persistence
- `src/services/roomSnapshot.ts` — clean GL capture, Photos save, native share and web download fallback

The ten GLBs use Meshopt compression and embedded WebP textures. A final release build should always be exercised on a physical iPhone before App Store submission.
