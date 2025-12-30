# Logo Setup Guide

## Where to Put Your Logo

For an Expo/React Native app, you have two types of logos:

### 1. **App Icon** (Home Screen Icon)
This is the icon that appears on the user's home screen.

**Recommended location:** `assets/icon.png`
- Create `icon.png` (1024x1024px recommended)
- Expo will automatically generate all sizes needed

**Alternative:** You can also put it in `assets/app-icon/icon.png` if you prefer organization

### 2. **In-App Logo** (Displayed inside the app)
This is the logo you show on splash screens, login screens, etc.

**Recommended location:** `assets/images/logo.png`
- Create an `images` folder: `assets/images/`
- Put your logo there: `assets/images/logo.png`
- Use it in code like: `require('../../assets/images/logo.png')`

**Alternative:** You could also use `assets/icons/logo.png` (since you already have an icons folder)

## Recommended Structure

```
assets/
  ├── icon.png                    ← App icon (home screen)
  ├── images/
  │   └── logo.png               ← In-app logo
  ├── icons/
  │   ├── gear.png
  │   ├── leaderboard.png
  │   └── ...
  └── sounds/
      └── ...
```

## My Recommendation

**Put your logo here:**
```
assets/images/logo.png
```

**Why:**
- Keeps it separate from icons (which are UI elements)
- Follows common React Native conventions
- Easy to organize if you add more images later

**For the app icon (home screen):**
```
assets/icon.png
```

## File Formats

- **PNG** (recommended) - supports transparency
- **SVG** - vector, but requires `react-native-svg` library
- **JPG** - no transparency support

## Image Sizes

- **App Icon:** 1024x1024px (Expo will auto-generate sizes)
- **In-App Logo:** 
  - Regular: 512x512px or higher
  - If you want @2x/@3x versions: `logo.png`, `logo@2x.png`, `logo@3x.png`

## After Adding the Logo

1. **For app icon:** Update `app.json` (I can help with this)
2. **For in-app logo:** Use it in your code like:
   ```tsx
   import { Image } from 'react-native';
   
   <Image 
     source={require('../assets/images/logo.png')} 
     style={{ width: 200, height: 200 }}
   />
   ```

## Quick Answer

**Just put it here:**
```
assets/images/logo.png
```

Then let me know and I'll help you use it in the app! 🎨



