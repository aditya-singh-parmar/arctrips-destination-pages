# Media and uploads

Images are the heart of these pages ("photography is the stage"). Today they are uploaded to Cloudinary by hand and referenced by public ID. There is **no upload path in the application**. This document records the conventions the backend's upload feature must preserve.

## 1. Where images live

| Store | What | Size | Deployed |
|---|---|---|---|
| Cloudinary cloud `du9doarye` | Hero and guide photography for Tofino and Ucluelet, listing photos | not measured | n/a, hosted |
| `design/prototype/media/<town>/imageN.jpg` | Original images for the 24 content-only towns | 274 MB, 855 files, all `.jpg` | No |
| `public/prototype/media/<town>/imageN.jpg` | Resized copies of the same | 96 MB | Yes, served at `/prototype/media/...` |

`sync-prototype.mjs` deliberately does not copy `media/`. A new local image must be added to both trees, optimised on the public side. The sync fails if a deployed page references an image the deployed tree lacks.

## 2. Cloudinary public IDs

156 distinct IDs in `corpus.json`, all verified to resolve on 2026-10-20.

| Pattern | Count | Meaning |
|---|---|---|
| `guides/<city>/<subject>/<slug>-N` | 142 | The convention. `N` is a photo index for that place. `_category-N` is the subject's own cover, for example `guides/tofino/beaches/_category-1` |
| `arcstudio/<hash>` | 6 | Legacy IDs (listings, town heroes). Many `arcstudio/*` IDs were deleted from Cloudinary in the past; always confirm an ID resolves before using it |
| bare name, for example `thomas-lipke-M12HGHNVJ2s-unsplash_nttcvc` | 8 | Stock photography uploaded without a folder |

Check an ID before use:

```bash
curl -sI "https://res.cloudinary.com/du9doarye/image/upload/<public_id>" | head -1
```

## 3. Delivery URLs

Pages build URLs with one helper, repeated in each page's inline script:

```js
const cld = (id, w, h) =>
  `https://res.cloudinary.com/du9doarye/image/upload/f_auto,q_auto,c_fill,w_${w},h_${h}/${id}`;
```

`f_auto,q_auto` let Cloudinary choose format and quality; `c_fill` crops to the requested box. Sizes in use include 240x180 (list rows), 620x450 and 640x480 (cards), 1000x750 (place photos), 1100x690 (feature), 2000x1000 (category hero). Next's own optimiser is turned off (`images.unoptimized: true`) because Cloudinary already does this. `next.config.ts` allows `res.cloudinary.com/du9doarye/**` and `placehold.net`.

The cloud `du9doarye` is shared by every ArcTrips site. On 2026-08-03 it was at 112% of the 25-credit free tier (28.22 of 25). Every distinct transformation of a photo is billed, so do not invent new widths: new sizes multiply credit use. The width ladder must stay identical across the sibling ArcTrips repos that build Cloudinary URLs. The write-up is `HANDOFF-CLOUDINARY.md` in the owner's parent workspace (`arctrips/docs/handoffs/`), which is not in this repository; ask the owner for it before changing sizes.

## 4. Rules the content imposes on media

1. **Alt text is mandatory and must describe the photo.** Pages reuse it. Past defects included a chalet card showing a group holding halibut and a cabin showing a fishing boat, because hero IDs were assigned loosely. Match the photo to the thing beside it.
2. A place photo is tagged to its place (`guides[].photos[].place`), so a caption never labels the wrong animal or beach.
3. Each subject shows one photo on the index and the same photo on its own page.
4. Do not reuse a stock frame against a subject it does not show (fishing has no frame of its own, and an inlet aerial was rejected).
5. Real imagery only: no placeholders on a published page (`placehold.net` is allowed in config as a dev fallback only).
6. Source images from `.docx` carry licences. The docx extraction left bare iStock URLs in body text; they identify the original asset and must be resolved to a licence record before publication.

## 5. Proposed upload flow (backend)

Signed, direct-to-Cloudinary. The browser never sees the API secret.

```
Admin UI                     Backend                         Cloudinary
   | POST /admin/media/signature  |                               |
   |  {town, subject, place?}     |                               |
   |----------------------------->| builds public_id per section 2,
   |                              | signs {public_id, timestamp, folder, allowed_formats}
   |<-----------------------------| {cloud_name, api_key, signature, timestamp, public_id}
   | POST image to /v1_1/du9doarye/image/upload ----------------->|
   |<------------------------------------------------ {public_id, width, height, bytes, format}
   | POST /admin/media  {public_id, alt, caption, licence, ...}   |
   |----------------------------->| inserts media_assets row, verifies the asset exists via the Admin API
   |<-----------------------------| 201 {id, public_id, url}
```

Constraints to enforce server-side: `allowed_formats` jpg, png, webp; maximum 20 MB; `public_id` built by the server (never taken from the client) as `guides/<town>/<subject>/<slug>-<next N>`; `alt` required before an asset can be attached to a published record; reject duplicates by `public_id`. The wire contract is in [API.md](API.md) section 6 and the table is `media_assets` in [DATA-SCHEMA.md](DATA-SCHEMA.md).

The 24 local-media towns should be migrated to Cloudinary in the same project, which retires the 274 MB originals tree and the two-tree sync of `media/`.
