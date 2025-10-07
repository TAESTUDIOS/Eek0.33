# Music Files for Chillout Ritual

## Setup Instructions

The **Chillout** ritual requires an audio file to play relaxing music.

### Required File
- **File name**: `chill1.mp3`
- **Location**: Place it in this directory (`public/music/`)
- **Format**: MP3 audio file
- **Recommended**: Ambient, chill, or relaxing music (at least 2-3 minutes long)

### Current Status
The file `chill1.mp3` exists in the root `music/` directory but needs to be **copied or moved** to `public/music/` for Next.js to serve it properly.

### How to Set Up
1. Copy the file from `music/chill1.mp3` to `public/music/chill1.mp3`
2. Or move it: `Move-Item music\chill1.mp3 public\music\chill1.mp3`

### How It Works
- When the Chillout ritual is triggered, the audio player will play a random 30-second segment from the file
- The random start time ranges from 0 to 120 seconds into the track
- This provides variety each time the ritual is activated

### Customization
To use a different audio file:
1. Replace `chill1.mp3` with your preferred audio file
2. Keep the same filename, or update the `audioSrc` in `/app/api/rituals/trigger/route.ts` (line ~408)
