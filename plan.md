# UI Modernization Plan

## Overview

Modernize the entire UI to have uniform controls, a simplified sidebar with app logo and icon-based navigation, theme toggle in sidebar, rename `/tables` to `/entities` with custom entity sidebar, redesign settings page, and enhance logs page with pagination.

## Key Changes

### 1. Sidebar Modernization

- **File**: `components/admin-dashboard.tsx`
- Update sidebar to show app logo (Shield icon) at top
- Convert navigation items to icon-only or icon+label format
- Move theme toggle from footer to sidebar (near top or bottom)
- Simplify sidebar structure, remove unnecessary labels
- Enable Logs section in navigation
- Ensure consistent styling with shadcn/ui components

### 2. Route Migration: /tables → /entities

- **Files**: 
- `lib/router.ts` - Update default route from `/tables` to `/entities`
- `components/admin-dashboard.tsx` - Update sidebar item and route handling
- `components/database/database-section.tsx` - Rename to `entities-section.tsx` and update all routes
- `app/page.tsx` - Update default navigation route
- Change all `/tables` references to `/entities`
- Update route parsing logic to handle `/entities` and `/entities/<entity_name>`

### 3. Entities Section with Custom Sidebar

- **File**: `components/database/database-section.tsx` → `components/entities/entities-section.tsx`
- Create a two-column layout in the main content area:
- Left: Entity list sidebar (fixed width, scrollable list of entities)
- Right: Entity detail view (table view when entity selected)
- Entity sidebar should:
- Show list of all entities from database
- Highlight selected entity
- Be searchable/filterable
- Show entity count or metadata
- When entity selected, navigate to `/entities/<entity_name>` and show table detail view
- Keep existing `TableDetailView` component but update routes

### 4. Settings Page Redesign

- **File**: `components/settings/settings-section.tsx`
- Redesign with modern card-based layout
- Group related settings into visually distinct sections
- Improve spacing and typography
- Use consistent shadcn/ui components (Cards, Inputs, Switches)
- Better visual hierarchy
- Cleaner form layout with proper labels and descriptions
- Remove "flunky" controls and simplify UI

### 5. Logs Page Enhancement

- **File**: `components/logs/logs-section.tsx`
- Add pagination component (use shadcn/ui Pagination)
- Display logs in a clean table format
- Show latest logs first (reverse chronological)
- Keep mock data for now (as requested)
- Improve table styling and responsiveness
- Add proper loading states

### 6. Uniform Controls Across All Pages

- Ensure all buttons, inputs, cards, and other controls use shadcn/ui components consistently
- Standardize spacing, sizing, and styling
- Review all components for consistency:
- `components/admins/admins-section.tsx`
- `components/sync/sync-section.tsx`
- All database/entity components

### 7. Theme Toggle Component Update

- **File**: `components/theme-toggle.tsx`
- Ensure it works well in sidebar context
- May need styling adjustments for sidebar placement

## Implementation Order

1. Sidebar modernization (logo, icons, theme toggle placement)
2. Route migration (/tables → /entities)
3. Entities section with custom sidebar
4. Settings page redesign
5. Logs page pagination
6. Final pass for uniform controls

## Files to Modify

- `components/admin-dashboard.tsx` - Main sidebar and routing
- `lib/router.ts` - Default route update
- `components/database/database-section.tsx` → `components/entities/entities-section.tsx` - Entity management
- `components/settings/settings-section.tsx` - Settings redesign
- `components/logs/logs-section.tsx` - Logs pagination
- `components/theme-toggle.tsx` - Sidebar integration
- `app/page.tsx` - Default route update
- Any other components referencing `/tables` route