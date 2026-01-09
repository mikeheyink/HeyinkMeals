---
description: Ensuring mobile UX is maintained when making UI changes
---

## Pre-Development Checklist

Before starting any UI work:
1. Open Chrome DevTools (Ctrl+Shift+I)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Set viewport to iPhone SE (375 × 667)

## Mobile-First Design Principles

### Touch Targets
- All interactive elements must be ≥44px × 44px
- Use the `.touch-target` utility class when needed
- Add sufficient spacing between tappable elements

### Responsive Breakpoints
```
sm: 640px   - Small tablets / large phones landscape
md: 768px   - Tablets portrait
lg: 1024px  - Tablets landscape / small laptops
```

### Conditional Component Rendering
For complex layouts that differ significantly on mobile, use the `useIsMobile()` hook:
```tsx
import { useIsMobile } from '@/hooks/useMediaQuery';

const MyComponent = () => {
    const isMobile = useIsMobile();
    
    return isMobile ? <MobileVersion /> : <DesktopVersion />;
};
```

## Component Patterns

### PageHeader
Already responsive - stacks vertically on mobile automatically.

### Grid Layouts
- Use `grid grid-cols-1 lg:grid-cols-X` for layouts that should stack on mobile
- Avoid `min-w-[Xpx]` that forces horizontal scroll

### Tables
- On mobile, convert tables to card lists
- See `MobilePlannerView` for the pattern

### Forms
- Full-width inputs on mobile
- Stack form fields vertically
- Use `text-base` for inputs to prevent iOS zoom

## Testing Checklist

// turbo
For each page, verify at 375px width:
- [ ] No horizontal scrolling
- [ ] All text is readable without zooming
- [ ] Buttons/links are easily tappable
- [ ] Forms work with virtual keyboard visible
- [ ] Navigation is accessible

## Files Using Mobile Views

| Page | Mobile Component |
|------|-----------------|
| Planner | `MobilePlannerView.tsx` |
| Cooking | `MobileCookingView.tsx` |
| CookingMode | Tab-based toggle (inline) |
| Pantry | Card list (inline) |
| Recipes | Card list (inline) |
