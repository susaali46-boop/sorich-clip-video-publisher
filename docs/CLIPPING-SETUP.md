# AI clipping setup

Sorich Studio uses the Reka Clip Generation API for the first YouTube-to-short-form workflow.

## What it does

1. A signed-in workspace member pastes a single YouTube video URL.
2. The server validates the URL and requires confirmation that the member owns the video or has permission to edit it.
3. Sorich creates a workspace-scoped generation job and submits the request to Reka.
4. Reka identifies up to three moments, renders vertical 9:16 clips with subtitles, and returns a title, caption, hashtags, and video URL for each completed clip.
5. Sorich stores the job and result metadata in `generation_jobs`. Results remain associated with the originating workspace.

The initial defaults are up to 3 clips, 15–60 seconds each, 720p, 9:16, and subtitles enabled. Provider usage may incur charges or consume account quota; check Reka's current pricing and account terms before enabling it.

## Required environment variable

Add this server-only environment variable in Vercel:

- Name: `REKA_API_KEY`
- Value: the API key generated in the Reka developer dashboard
- Environments: Preview first; Production only after staging tests pass

Do not prefix it with `NEXT_PUBLIC_`. Never commit the key or paste it into source files, issues, screenshots, or browser code. After saving it, redeploy the Preview environment.

The application exposes only a boolean configuration status to the browser; it never returns the key.

## Provider API

- Base URL: `https://vision-agent.api.reka.ai`
- Submit: `POST /v1/clips`
- Poll: `GET /v1/clips/{id}`
- Authentication: `X-Api-Key` request header

Official reference: https://docs.reka.ai/vision/highlight-clip-generation

## Current limitations

- OAuth/social publishing is not part of this milestone.
- Clips are generated and previewed in Sorich; they are not automatically published.
- A user must have the rights to edit and reuse the source video.
- The API key and an authorized test video are required for an end-to-end live generation test.
- Provider output URLs are external HTTPS URLs. Private archival into Sorich storage and clip-to-post attachment are follow-up work.
