# Grit On Call - Atomic Design System

## Color Palette

```typescript
Colors = {
  black: '#050505',      // Backgrounds
  red: '#ff0000',        // Primary actions, active states
  darkBlue: '#233551',   // Secondary elements, cards, tab bar
  lightGray: '#aaaaaa',  // Inactive text, secondary text
  white: '#FFFFFF',      // Primary text
}
```

## Atomic Design Structure

### 1. Atoms (Basic Building Blocks)

#### Button (`components/atoms/Button.tsx`)
**Variants:**
- `primary` - Red background, white text
- `secondary` - Dark blue background, white text
- `outline` - Transparent with red border

**Props:**
- `title: string`
- `onPress: () => void`
- `variant?: 'primary' | 'secondary' | 'outline'`
- `disabled?: boolean`

**Usage:**
```tsx
<Button 
  title="APPROVE PLAN" 
  onPress={handleApprove} 
  variant="primary" 
/>
```

#### Typography (`components/atoms/Typography.tsx`)
**Variants:**
- `h1` - 32px, bold, white
- `h2` - 24px, bold, white
- `h3` - 18px, semi-bold, white
- `body` - 16px, light gray
- `caption` - 12px, light gray
- `label` - 14px, semi-bold, red

**Props:**
- `variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label'`
- `children: React.ReactNode`
- `color?: string` (override)

**Usage:**
```tsx
<Typography variant="h2">Title</Typography>
<Typography variant="body">Content text</Typography>
```

### 2. Molecules (Simple Combinations)

#### Card (`components/molecules/Card.tsx`)
**Features:**
- Dark blue background (#233551)
- Rounded corners (12px)
- Padding (16px)
- Optional title (red label)

**Props:**
- `title?: string`
- `children: React.ReactNode`

**Usage:**
```tsx
<Card title="Monthly Goal">
  <Typography variant="body">Your goal text</Typography>
</Card>
```

### 3. Organisms (Complex Components)

#### AppHeader (`components/AppHeader.tsx`)
- iOS-style bottom tab bar
- Dark blue background
- Red for active, light gray for inactive
- 4 tabs: Today, Plan, Progress, Settings

### 4. Templates & Pages

All screens should follow this structure:
```tsx
<View style={styles.wrapper}>  // Black background
  <ScrollView style={styles.container}>  // Content area
    <Typography variant="h2">Page Title</Typography>
    <Card title="Section">
      <Typography variant="body">Content</Typography>
    </Card>
    <Button title="ACTION" variant="primary" onPress={handler} />
  </ScrollView>
  <AppHeader />  // Tab bar at bottom
</View>
```

## Design Principles

1. **Consistency**: Use atomic components instead of custom styles
2. **Color Hierarchy**:
   - Black backgrounds
   - Red for primary actions
   - Dark blue for secondary elements
   - Light gray for secondary text
   - White for primary text

3. **Typography Scale**:
   - H1: Page titles (32px)
   - H2: Section titles (24px)
   - H3: Subsection titles (18px)
   - Body: Main content (16px)
   - Caption: Small text (12px)
   - Label: Form labels, card titles (14px, red)

4. **Spacing**:
   - Container padding: 24px
   - Card margin: 16px bottom
   - Button gap: 16px
   - Section padding: 24px

5. **Components**:
   - Always use `<Button>` instead of `<Pressable>`
   - Always use `<Typography>` instead of `<Text>`
   - Use `<Card>` for grouped content
   - Use atomic components for consistency

## Migration Checklist

When updating a screen:
- [ ] Import atomic components
- [ ] Replace `<Text>` with `<Typography>`
- [ ] Replace `<Pressable>` with `<Button>`
- [ ] Group related content in `<Card>`
- [ ] Use Colors from `@/constants/colors`
- [ ] Remove custom text/button styles
- [ ] Test on both iOS and Android
