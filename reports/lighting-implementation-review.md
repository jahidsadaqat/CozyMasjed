# Lighting pipeline implementation review

## Accepted and implemented

- One generated manifest entry for every public catalog asset.
- Three shared 256 px grayscale glow textures.
- Additive, depth-tested glow quads with `toneMapped={false}`.
- Every placed emitter remains active simultaneously. Runtime point lights do
  not cast realtime shadows, keeping the additional GPU cost controlled.
- Low-frequency flicker for candle, bakhoor and string lights.
- Runtime material patching for verified emissive-map materials.
- Authored metallic-roughness masks are preserved for the listed metal assets.

## Corrected before implementation

The supplied table was treated as a design specification, not as verified model
metadata. The GLBs were inspected before enabling emission.

- `masjid-model` is a prayer rug and is not an emitter.
- `mini-masjid` is a retired catalog item and is not an emitter.
- `minaret` is a legacy ID for a globe fanous model.
- `curtains` is a legacy ID for a star wall lantern.
- The two chandelier models are wall-mounted in this catalog, not ceiling-mounted.
- The floor-lamp source origin was lowered to fit its normalized in-app height.
- Bakhoor source origins were raised to the actual bowl openings.
- String lights contain six visible bulbs over about 0.78 m, not nine over 2 m.
- Mashrabiya, prayer-times clock and both crescent models do not contain isolated
  emissive masks in the current GLBs. Enabling them would illuminate unrelated
  pixels, so they remain non-emitters until dedicated masks are authored.
- Cyan mashrabiya wall wash was rejected because it conflicts with the established
  warm lighting direction and the prior removal of source-less cyan wall spots.

This leaves 11 verified emitters in the runtime manifest.

## Metal handling

Meshy commonly stores metal and non-metal parts in one material. Applying
`metallic = 1` to the entire material would turn fabric, wood and glass housing
into metal. The runtime therefore applies full metallic strength only where the
asset has an authored `metalnessMap`, and uses the requested roughness value for
that masked material.

The oval mirror is a single mixed material in the source GLB. Its frame and glass
cannot safely receive two independent scalar settings without a new material
mask or mesh split, so the authored metallic-roughness texture is preserved.

## Native optimization decision

The requested final WebP + Meshopt pass was intentionally not run.

- The current Expo native loader supports bundled JPEG/PNG model textures.
- The native preflight explicitly requires exact GLB bytes and rejects runtime
  Meshopt.
- Reintroducing WebP or Meshopt would risk the same release-only GLB loading
  failures previously seen in TestFlight.

Current native preflight:

- 122 GLBs
- 171.88 MB on disk
- 412 JPEG textures and 1 PNG texture
- all embedded model textures at or below 1024 px
- no runtime Meshopt dependency

The original GLBs were not rewritten by this lighting pass.
