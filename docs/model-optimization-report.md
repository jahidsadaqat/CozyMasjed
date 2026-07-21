# GLB mobile optimization report

All 63 Meshy exports were optimized with `@gltf-transform/cli` 4.4.1 for mobile web:

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
| `019f8537-c261-758b-87e0-40852a0d0c5a/Meshy_AI_model.glb` | 25.32 MiB | 1996.8 KiB | 1024x1024 | 150,196 | None |
| `019f8537-f31f-759c-93ef-0f074cc696a6/Meshy_AI_model.glb` | 23.30 MiB | 1784.9 KiB | 1024x1024 | 142,449 | None |
| `019f8538-17b2-7bad-b38f-d89d7f1da4da/Meshy_AI_model.glb` | 20.50 MiB | 1307.5 KiB | 1024x1024 | 97,106 | None |
| `019f8538-6519-7f30-af82-b02549bf4991/Meshy_AI_model.glb` | 11.19 MiB | 621.9 KiB | 1024x1024 | 44,660 | None |
| `019f8538-db8a-7bdc-992d-ddea36a66d29/Meshy_AI_model.glb` | 31.35 MiB | 1887.3 KiB | 512x512 | 149,736 | None |
| `019f8539-0e83-7779-8ec3-48ad5c706b28/Meshy_AI_model.glb` | 25.63 MiB | 1970.8 KiB | 1024x1024 | 152,901 | None |
| `019f8539-585b-7f55-83a0-38216c0bc5ae/Meshy_AI_model.glb` | 74.27 MiB | 1900.0 KiB | 512x512 | 136,736 | None |
| `019f8539-871b-7f5c-ab84-ee98d75c2100/Meshy_AI_model.glb` | 17.68 MiB | 1213.5 KiB | 1024x1024 | 89,023 | None |
| `019f8539-bee8-7f89-b461-dbc032e496c7/Meshy_AI_model.glb` | 33.61 MiB | 1806.3 KiB | 512x512 | 143,995 | None |
| `019f8539-fd3d-7f9d-b350-85da1bc283b1/Meshy_AI_model.glb` | 19.95 MiB | 1420.8 KiB | 1024x1024 | 110,413 | None |
| `019f854f-c88e-7fc0-90af-b33c315e10d4/Meshy_AI_model.glb` | 27.18 MiB | 1610.0 KiB | 512x512 | 127,509 | None |
| `019f854f-e6a3-7206-8991-125d8dc6b06e/Meshy_AI_model.glb` | 36.37 MiB | 1746.4 KiB | 512x512 | 137,974 | None |
| `019f8550-05c9-7bb2-b7f7-ac81c843d21f/Meshy_AI_model.glb` | 26.69 MiB | 1696.9 KiB | 512x512 | 130,809 | None |
| `019f8550-27ed-7ff8-b41c-f5f079cf1b2f/Meshy_AI_model.glb` | 30.09 MiB | 1817.7 KiB | 512x512 | 142,343 | None |
| `019f8550-4906-75f8-b828-3062a6928b6e/Meshy_AI_model.glb` | 64.17 MiB | 1778.0 KiB | 512x512 | 136,655 | None |
| `019f8550-6bf0-760b-83ee-d75448bdbe6e/Meshy_AI_model.glb` | 23.55 MiB | 1826.9 KiB | 1024x1024 | 139,894 | None |
| `019f8550-9d69-7024-bee4-b3205c7014eb/Meshy_AI_model.glb` | 17.50 MiB | 1279.5 KiB | 1024x1024 | 94,965 | None |
| `019f8550-bf7a-7c08-8f94-f35788456356/Meshy_AI_model.glb` | 38.98 MiB | 1809.2 KiB | 512x512 | 140,585 | None |
| `019f8550-f579-7033-a953-9bf91d447fcd/Meshy_AI_model.glb` | 11.74 MiB | 686.0 KiB | 1024x1024 | 50,541 | None |
| `019f8552-04e3-70cc-b4ea-c05cd99990e9/Meshy_AI_model.glb` | 37.38 MiB | 1688.1 KiB | 512x512 | 131,929 | None |
| `019f8552-3336-7695-a9e9-94a910c9a521/Meshy_AI_model.glb` | 22.47 MiB | 1882.4 KiB | 1024x1024 | 147,576 | None |
| `019f8552-544c-70e1-aa91-3ef0b52ae6e4/Meshy_AI_model.glb` | 18.58 MiB | 1393.0 KiB | 1024x1024 | 109,835 | None |
| `019f8552-74ff-7c74-aca9-569bcdd979c5/Meshy_AI_model.glb` | 38.17 MiB | 1818.5 KiB | 512x512 | 142,184 | None |
| `019f8552-9418-76a5-a200-155ab3460399/Meshy_AI_model.glb` | 49.80 MiB | 1995.0 KiB | 512x512 | 154,202 | None |
| `019f8552-d36f-76be-8307-25be90989881/Meshy_AI_model.glb` | 25.32 MiB | 2010.6 KiB | 1024x1024 | 155,038 | None |
| `019f8552-ef33-7c93-8234-c8f3158710a2/Meshy_AI_model.glb` | 9.83 MiB | 510.3 KiB | 1024x1024 | 37,376 | None |
| `019f8553-2207-7118-8d28-bacdef4fc60f/Meshy_AI_model.glb` | 26.28 MiB | 1405.1 KiB | 512x512 | 111,321 | None |

## Verification

- Files inspected: 63
- Total source size: 3436.94 MiB
- Total optimized size: 54.69 MiB
- Largest optimized file: 2010.6 KiB
- Budget result: every file is below the 2 MiB prop limit. Thirteen high-density files use the required 512px fallback and additional static-mesh simplification.
- Texture result: every embedded texture is WebP and no texture exceeds 1024x1024.
- Animation result: this export batch contains no animation clips, including no Salah, Walking, or Running clips.
- Validator result: all 63 files report no glTF validation errors.
- Loader requirement: outputs use `EXT_meshopt_compression`; the app registers `MeshoptDecoder` before loading.
