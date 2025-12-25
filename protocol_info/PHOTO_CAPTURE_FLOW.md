# Photo Capture Flow - Specification

## Storage Decision: Local-First

**Approach:** Store all progress photos locally using `expo-file-system`

**Implementation:**
```javascript
import * as FileSystem from 'expo-file-system';

const PHOTO_DIR = FileSystem.documentDirectory + 'progress_photos/';
```

**Why local:**
- Zero storage costs (vs Firebase at $0.026/GB + $0.12/GB download)
- GDPR-friendly - data never leaves device, minimal legal burden
- Private by default - not in gallery, not visible to other apps
- Works offline, faster to display

**Trade-offs accepted:**
- Photos lost if user deletes app or switches phones
- No cross-device sync (could add as premium feature later)

---

## Photo Capture UI

### Screen Layout
```
┌─────────────────────────────────────┐
│                              [X]    │  ← Close button
│                                     │
│    ┌───────────────────────────┐    │
│    │                           │    │
│    │      [Camera Preview]     │    │
│    │                           │    │
│    │    ╭───────────────╮      │    │  ← Face outline overlay (PNG)
│    │    │               │      │    │
│    │    │   ──  ──      │      │    │  ← Eye level guide
│    │    │               │      │    │
│    │    │      │        │      │    │  ← Center line
│    │    │               │      │    │
│    │    ╰───────────────╯      │    │
│    │                           │    │
│    └───────────────────────────┘    │
│                                     │
│    Use the same spot and lighting   │  ← Tip text
│    each week for best comparison.   │
│                                     │
│           [ ◯ Capture ]             │  ← Shutter button
│                                     │
└─────────────────────────────────────┘
```

### Overlay PNG Asset (TO CREATE)
**File needed:** `face-outline.png`
- Transparent background
- White or light gray oval shape (face outline)
- Horizontal line at eye level
- Vertical center line
- Subtle, not distracting (~30% opacity)

---

## Capture Flow

```
User taps "Take Week X Photo"
       ↓
Camera opens with face outline overlay
       ↓
Tip text shown: "Use the same spot and lighting each week"
       ↓
User aligns face, taps capture
       ↓
Preview shown with options:
  [ Retake ]    [ Use Photo ]
       ↓
Photo saved to local storage:
  FileSystem.documentDirectory/progress_photos/week_X_[timestamp].jpg
       ↓
"What to Expect" card shown (Week X content)
       ↓
Return to Progress tab
```

---

## Photo Naming Convention

```
progress_photos/
  ├── week_0_1703001234567.jpg
  ├── week_1_1703606034567.jpg
  ├── week_2_1704210834567.jpg
  └── ...
```

Format: `week_[number]_[unix_timestamp].jpg`

---

## Technical Notes

### Camera Implementation
- Use `expo-camera` for capture
- Front camera only (selfie mode)
- Overlay the face-outline PNG as an absolute-positioned View on top of camera preview

### Storage Implementation
```javascript
// After capture
const saveProgressPhoto = async (photoUri, weekNumber) => {
  const filename = `week_${weekNumber}_${Date.now()}.jpg`;
  const destination = PHOTO_DIR + filename;

  // Ensure directory exists
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });

  // Copy from camera cache to permanent storage
  await FileSystem.copyAsync({
    from: photoUri,
    to: destination
  });

  return destination;
};
```

### Compression
- Compress before saving to reduce storage footprint
- Target: ~500KB-1MB per photo (down from 2-3MB raw)
- Use `expo-image-manipulator` for resizing/compression

---

## Weekly Photo Prompt

**Trigger:** Same day each week, based on sign-up day

**Notification:**
```
Week 3 photo.
Same spot. Same lighting.
```

**In-app prompt (Progress tab):**
```
┌─────────────────────────────────────┐
│  Week 3 Photo                       │
│                                     │
│  Same day. Same spot. Same light.   │
│                                     │
│         [ Take Photo ]              │
└─────────────────────────────────────┘
```

---

## Comparison View

**Side-by-side display:**
```
┌─────────────────────────────────────┐
│  Week 0          →         Week 3   │
│ ┌─────────┐           ┌─────────┐   │
│ │         │           │         │   │
│ │  Photo  │           │  Photo  │   │
│ │         │           │         │   │
│ └─────────┘           └─────────┘   │
│                                     │
│         [ ← ]  Week 3  [ → ]        │  ← Swipe/arrows to change
└─────────────────────────────────────┘
```

- Week 0 always on left (baseline)
- Right side shows selected week
- Swipe or arrows to cycle through weeks

---

## Future Consideration (Not MVP)

- Cloud backup as premium feature
- Export/share functionality
- Timelapse video generation
- AI face analysis overlay

---

*Decision locked: December 2025*
