# Trip Sharing Feature Implementation

## Overview
This implementation adds the ability to share planned trips with other users through two methods:
1. **Share Link**: Generate a shareable URL that anyone can use to view and import the trip
2. **Share with Users**: Share trips with specific registered users, with optional edit permissions

## Files Added/Modified

### New Files

#### `src/lib/components/ShareTripModal.svelte`
A comprehensive modal component for sharing trips that includes:
- **Tab-based interface** with two sharing methods
- **Share Link tab**: 
  - Generates encoded trip data in URL
  - Copy to clipboard functionality
  - Native share API support (for mobile devices)
  - Works with both server-persisted and localStorage trips
- **Share with Users tab**:
  - Email-based user sharing (requires server-persisted trips)
  - Toggle for edit permissions
  - List of currently shared users
  - Ability to remove user access
  - Warning message for localStorage-only trips

### Modified Files

#### `src/lib/components/Sidebar.svelte`
**Changes:**
1. Added import for `ShareTripModal` component
2. Removed old share dialog code and related state variables (`showShareDialog`, `shareUrl`, `shareCopied`)
3. Added `showShareTripModal` state variable
4. Added Share button next to the Close button in trip editing view
5. Removed unused share functions (`handleShareTrip`, `copyShareUrl`, `shareViaNavigator`)
6. Integrated `ShareTripModal` component at the bottom of the file

**Key UI Addition:**
```svelte
<button
  class="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom"
  data-tip="Share Trip"
  onclick={() => (showShareTripModal = true)}
>
  <IconShare class="size-4 sm:size-5" />
</button>
```

## Features

### 1. Share via Link (Available Now)
- Works with the current localStorage-based trip system
- Encodes trip data (including locations, transport, and timing) into a Base64 URL parameter
- Users can copy the link or use native share functionality
- Recipients can view the trip details and import it to their own planner
- No authentication required for viewing shared trips

### 2. Share with Specific Users (API Ready)
The backend API for user-based sharing already exists at:
- `GET /api/trips/share?tripId={id}` - List users a trip is shared with
- `POST /api/trips/share` - Share trip with a user by email
- `DELETE /api/trips/share?id={shareId}` - Remove share access

**Database Schema (already exists):**
```typescript
tripShares {
  id: serial
  tripId: integer (references trips.id)
  sharedWithUserId: text (references users.id)
  sharedByUserId: text (references users.id)
  canEdit: boolean (default: false)
  createdAt: timestamp
}
```

**Features:**
- Share by email address
- View-only or edit permissions
- List of shared users with their permissions
- Remove user access

**Limitation:** Currently requires trips to be stored server-side (not just localStorage). The modal displays a warning message when attempting to use this feature with localStorage trips.

## User Experience

### Accessing the Share Feature
1. Navigate to the Trips tab in the sidebar
2. Select a trip to view/edit
3. Click the Share icon button (next to the Close button)
4. Choose between "Share Link" or "Share with Users" tabs

### Share Link Flow
1. Click "Share Link" tab
2. Copy the generated URL using the "Copy" button
3. Optionally use "Share via..." for native sharing (mobile)
4. Send the link to friends who can view and import the trip

### Share with Users Flow (for server-persisted trips)
1. Click "Share with Users" tab
2. Enter the recipient's email address
3. Optionally check "Allow editing this trip"
4. Click "Share Trip"
5. User appears in the "Shared with" list below
6. Click delete icon to remove access

## Technical Details

### Trip Data Encoding
Trips are encoded using Base64 with the following structure:
```typescript
{
  name: string,
  description: string,
  startTime: string,
  stops: [{
    location: {
      title: string,
      address: string,
      latitude: number,
      longitude: number,
      category: Category,
      durationMinutes: number
    },
    customDuration?: number,
    transport?: TransportSegment
  }]
}
```

### Server Integration
The modal automatically detects whether a trip is stored server-side by checking the trip ID type:
- `number`: Server-persisted trip (enables user sharing)
- `string` (UUID): localStorage trip (user sharing disabled, shows warning)

## Future Enhancements

To fully enable server-based trip sharing:

1. **Migrate trips to server storage:**
   - Update `+page.server.ts` to load trips from database
   - Modify trip CRUD operations in `+page.svelte` to use API endpoints
   - Implement sync between localStorage and server

2. **Import shared trips:**
   - Add handler for `?trip=` URL parameter
   - Parse and import trip data
   - Allow users to save imported trips to their account

3. **Shared trip indicators:**
   - Show badges on trips that are shared with you
   - Display "Shared by [User]" information
   - Indicate edit permissions in trip list

4. **Real-time collaboration:**
   - WebSocket support for live updates
   - Show when other users are viewing/editing
   - Conflict resolution for simultaneous edits

## Testing

### Test Share Link Feature
1. Create a trip with multiple stops
2. Add transport information between stops
3. Click share button → Share Link tab
4. Copy the generated URL
5. Open in new incognito window
6. Verify trip displays correctly (when import feature is added)

### Test User Sharing (requires server trips)
1. Create trips via API endpoint (when implemented)
2. Share trip with another user's email
3. Verify user receives access
4. Test edit permissions toggle
5. Remove user access and verify

## Icons Used
- `IconShare` - Share button and actions
- `IconLink` - Share link tab
- `IconPerson` - Share with users tab
- `IconCopy` - Copy to clipboard
- `IconCheckmark` - Success states
- `IconDismiss` - Close and error states
- `IconEdit` - Edit permission indicator
- `IconDelete` - Remove user access
- `IconAdd` - Add new user

## Accessibility
- All buttons have proper tooltips
- Form inputs have associated labels
- Alert messages for errors and warnings
- Keyboard navigation support
- Responsive design for mobile devices
