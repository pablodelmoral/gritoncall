# Fonts Setup

## Adding the Akira Extended Font

1. **Font file:** `Akira Expanded.otf` is already in this folder (`assets/fonts/`)

2. The app is configured to automatically load this font on startup

3. The font is used throughout the app for:
   - Header titles (all pages)
   - Important UI text
   - Call-to-action buttons

## Font Usage in Code

To use the Akira Extended font in your styles:

```typescript
{
  fontFamily: 'Akira-Extended',
  fontSize: 14,
  letterSpacing: 2,
}
```

## Current Implementation

The font is loaded in:
- `hooks/useFonts.ts` - Font loading hook
- `app/_layout.tsx` - App initialization with loading screen

Applied to:
- All header bar titles
- Section headings
- Button text (can be extended)
