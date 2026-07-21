# GLB mobile optimization report

All 36 Meshy exports were optimized with `@gltf-transform/cli` 4.4.1 for mobile web:

```powershell
npx gltf-transform optimize input.glb output.glb --texture-compress webp --texture-size 1024
```

The source scan and the final `inspect` pass found no skins or animations in this batch, so the standard static-prop pipeline was used for every file.

| File | Before | After | Max texture | Vertices | Animations |
| --- | ---: | ---: | ---: | ---: | --- |
| `019f84b4-9a02-7b73-af0f-0f26875f3ec6/Meshy_AI_model.glb` | 46.94 MiB | 283.2 KiB | 1024x1024 | 11,106 | None |
| `019f84b5-08ce-7b99-a333-f231baebef96/Meshy_AI_model.glb` | 48.74 MiB | 260.9 KiB | 1024x1024 | 10,244 | None |
| `019f84b5-498e-7bc3-90e7-f0056d2234c2/Meshy_AI_model.glb` | 53.31 MiB | 290.8 KiB | 1024x1024 | 11,394 | None |
| `019f84b5-7d72-7bfc-bb76-a77c71c1b402/Meshy_AI_model.glb` | 52.72 MiB | 263.1 KiB | 1024x1024 | 10,349 | None |
| `019f84b5-c2f7-7f5b-a829-5b4c6855e6bc/Meshy_AI_model.glb` | 47.63 MiB | 290.2 KiB | 1024x1024 | 10,846 | None |
| `019f84b5-e546-7a75-97ad-674defdbfafc/Meshy_AI_model.glb` | 60.49 MiB | 244.5 KiB | 1024x1024 | 9,755 | None |
| `019f84b6-0877-7b2b-84e2-29d4036864f1/Meshy_AI_model.glb` | 56.28 MiB | 323.5 KiB | 1024x1024 | 13,002 | None |
| `019f84b6-33f0-7a93-af0f-e61db1230ee7/Meshy_AI_model.glb` | 58.64 MiB | 313.3 KiB | 1024x1024 | 11,665 | None |
| `019f84b6-5413-7c56-94c0-5d3faf160eb8/Meshy_AI_model.glb` | 57.88 MiB | 319.6 KiB | 1024x1024 | 12,056 | None |
| `019f84bb-74b8-7b8e-86bf-831942b99f6c/Meshy_AI_model.glb` | 85.63 MiB | 348.7 KiB | 1024x1024 | 14,346 | None |
| `019f84bb-d32f-7ba8-b4e4-f549c90433ce/Meshy_AI_model.glb` | 89.01 MiB | 693.1 KiB | 1024x1024 | 26,464 | None |
| `019f84bb-f404-7f36-a4e8-5ff045aefba1/Meshy_AI_model.glb` | 75.27 MiB | 505.2 KiB | 1024x1024 | 22,159 | None |
| `019f84bc-198f-7f44-a22d-823950f10441/Meshy_AI_model.glb` | 110.73 MiB | 329.5 KiB | 1024x1024 | 12,716 | None |
| `019f84bc-36a4-7c92-86dd-50b7b8f15571/Meshy_AI_model.glb` | 100.56 MiB | 270.5 KiB | 1024x1024 | 11,646 | None |
| `019f84bc-61fd-7052-ac59-40ca7840a4a4/Meshy_AI_model.glb` | 79.31 MiB | 619.6 KiB | 1024x1024 | 21,383 | None |
| `019f84bc-93b3-705a-9fa3-1190d5d61500/Meshy_AI_model.glb` | 76.62 MiB | 532.6 KiB | 1024x1024 | 21,278 | None |
| `019f84bc-b984-7f95-a070-b5b95ea7b512/Meshy_AI_model.glb` | 75.51 MiB | 493.1 KiB | 1024x1024 | 20,017 | None |
| `019f84bc-eaf9-7c9c-8c27-093e5ef92f99/Meshy_AI_model.glb` | 77.76 MiB | 275.9 KiB | 1024x1024 | 12,823 | None |
| `019f84be-973c-70bf-80b6-0ad670d99f31/Meshy_AI_model.glb` | 47.83 MiB | 248.1 KiB | 1024x1024 | 9,594 | None |
| `019f84c2-4f81-7dc9-9f5a-0cad4e837cb4/Meshy_AI_model.glb` | 72.39 MiB | 292.4 KiB | 1024x1024 | 11,648 | None |
| `019f84c8-0924-73ab-800a-205d44763298/Meshy_AI_model.glb` | 81.79 MiB | 286.2 KiB | 1024x1024 | 11,100 | None |
| `019f84c8-22f5-7f60-b91c-0600e9f6890e/Meshy_AI_model.glb` | 44.15 MiB | 227.3 KiB | 1024x1024 | 10,659 | None |
| `019f84c8-4326-7f65-a6fc-13bde37c810a/Meshy_AI_model.glb` | 84.59 MiB | 207.7 KiB | 1024x1024 | 10,166 | None |
| `019f84c8-61a8-73be-b6fd-efa0e0674c89/Meshy_AI_model.glb` | 71.10 MiB | 274.2 KiB | 1024x1024 | 10,783 | None |
| `019f84c8-829d-78f6-a511-9e3c5302645e/Meshy_AI_model.glb` | 74.32 MiB | 349.9 KiB | 1024x1024 | 12,210 | None |
| `019f84c8-a843-7f7e-a757-efe28fe1fa64/Meshy_AI_model.glb` | 61.60 MiB | 274.9 KiB | 1024x1024 | 10,678 | None |
| `019f84c8-cc97-7f84-9ad4-3a52aeecded2/Meshy_AI_model.glb` | 78.82 MiB | 248.8 KiB | 1024x1024 | 14,181 | None |
| `019f84c8-f701-738b-8bac-29a6d893fada/Meshy_AI_model.glb` | 85.80 MiB | 288.6 KiB | 1024x1024 | 12,708 | None |
| `019f8506-18ca-7799-8fb4-ecc98a145539/Meshy_AI_model.glb` | 85.05 MiB | 336.8 KiB | 1024x1024 | 13,765 | None |
| `019f8506-45ce-7c7a-a348-6cda7ef9eb35/Meshy_AI_model.glb` | 89.66 MiB | 697.9 KiB | 1024x1024 | 26,387 | None |
| `019f8506-700c-7557-bb71-4f2a84794c70/Meshy_AI_model.glb` | 74.20 MiB | 505.3 KiB | 1024x1024 | 22,200 | None |
| `019f8506-98a7-7046-b98c-befd71c06f0d/Meshy_AI_model.glb` | 110.03 MiB | 341.0 KiB | 1024x1024 | 13,439 | None |
| `019f8506-bfb5-7ca9-bdde-586506044a5f/Meshy_AI_model.glb` | 101.93 MiB | 265.8 KiB | 1024x1024 | 11,455 | None |
| `019f8506-e6cc-7577-871a-9424a3a3c3a6/Meshy_AI_model.glb` | 78.98 MiB | 607.7 KiB | 1024x1024 | 21,259 | None |
| `019f8507-1554-7063-a1bf-12353f048de6/Meshy_AI_model.glb` | 76.33 MiB | 540.2 KiB | 1024x1024 | 22,021 | None |
| `019f8507-4154-759d-9298-95f8f238a8fb/Meshy_AI_model.glb` | 78.44 MiB | 494.0 KiB | 1024x1024 | 19,476 | None |

## Verification

- Files inspected: 36
- Total source size: 2650.03 MiB
- Total optimized size: 12.84 MiB
- Largest optimized file: 697.9 KiB
- Budget result: every file is below the 2 MiB prop limit; no 512px retry was needed.
- Texture result: every embedded texture is WebP and no texture exceeds 1024x1024.
- Animation result: this export batch contains no animation clips, including no Salah, Walking, or Running clips.
- Validator result: all 36 files report no glTF validation errors.
- Loader requirement: outputs use `EXT_meshopt_compression`; the app registers `MeshoptDecoder` before loading.
