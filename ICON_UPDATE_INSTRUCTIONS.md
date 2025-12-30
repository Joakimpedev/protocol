# Icon Update Instructions

## ✅ Current Configuration

Your icon is correctly configured in `app.json`:
- **iOS Icon**: `./assets/images/icon.png`
- **Android Adaptive Icon**: `./assets/images/icon.png`
- **EAS**: Automatically uses the icon from `app.json`

## 🧹 Clear Caches to Pick Up New Icon

After updating the icon image, clear caches to ensure the new icon is used:

### 1. Clear Local Expo Cache

```bash
# Clear Expo cache
npx expo start --clear

# Or manually clear
rm -rf .expo
rm -rf node_modules/.cache
```

### 2. Clear EAS Build Cache (if needed)

EAS builds cache assets. To force a fresh build with the new icon:

```bash
# Build with --clear-cache flag
eas build --platform ios --clear-cache
eas build --platform android --clear-cache
```

### 3. For Development Builds

If you're using a development build, you may need to rebuild:

```bash
# Rebuild development client
eas build --profile development --platform ios --clear-cache
```

## 📋 Icon Requirements

For best results, your icon should be:
- **Size**: 1024x1024px (Expo will auto-generate all sizes)
- **Format**: PNG (with or without transparency)
- **Location**: `assets/images/icon.png`

## ✅ Verification

After clearing cache and rebuilding:
1. The icon should appear on your device's home screen
2. Check both iOS and Android if building for both platforms
3. Verify the icon looks correct at different sizes

## 🔄 No Need to Delete eas.json

**You don't need to delete `eas.json`** - it doesn't cache icons. The icon is read from `app.json` during each build.

The `eas.json` file only contains build configuration (profiles, distribution settings, etc.) and doesn't affect icon loading.

