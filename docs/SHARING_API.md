# Trip Sharing API Documentation

## Overview

The trip sharing API allows users to share their trips with other registered users, with configurable view/edit permissions.

**Base URL:** `/api/trips/share`

**Authentication:** Required (session-based)

---

## Endpoints

### 1. Get Shared Users for a Trip

Retrieve a list of all users a trip has been shared with.

**Endpoint:** `GET /api/trips/share`

**Query Parameters:**
- `tripId` (required): The ID of the trip

**Authorization:**
- Must be the trip owner

**Response:** `200 OK`
```json
[
  {
    "id": 123,
    "userId": "user_abc123",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "canEdit": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 124,
    "userId": "user_def456",
    "userName": "Jane Smith",
    "userEmail": "jane@example.com",
    "canEdit": true,
    "createdAt": "2024-01-16T14:20:00.000Z"
  }
]
```

**Error Responses:**

- `401 Unauthorized` - User not logged in
- `400 Bad Request` - Missing tripId parameter
- `404 Not Found` - Trip does not exist
- `403 Forbidden` - User is not the trip owner

**Example:**
```javascript
const response = await fetch('/api/trips/share?tripId=42');
const sharedUsers = await response.json();
```

---

### 2. Share a Trip with a User

Share a trip with another user by their email address.

**Endpoint:** `POST /api/trips/share`

**Request Body:**
```json
{
  "tripId": 42,
  "email": "friend@example.com",
  "canEdit": false
}
```

**Fields:**
- `tripId` (required, number): The ID of the trip to share
- `email` (required, string): Email address of the user to share with
- `canEdit` (optional, boolean): Whether the user can edit the trip (default: false)

**Authorization:**
- Must be the trip owner
- Cannot share with yourself
- Target user must exist

**Response:** `201 Created` (new share) or `200 OK` (updated share)
```json
{
  "id": 125,
  "tripId": 42,
  "sharedWithUserId": "user_ghi789",
  "sharedByUserId": "user_abc123",
  "canEdit": false,
  "createdAt": "2024-01-17T09:15:00.000Z",
  "userName": "Friend Name",
  "userEmail": "friend@example.com"
}
```

**Error Responses:**

- `401 Unauthorized` - User not logged in
- `400 Bad Request` - Missing required fields or trying to share with self
- `404 Not Found` - Trip or target user not found
- `403 Forbidden` - User is not the trip owner

**Example:**
```javascript
const response = await fetch('/api/trips/share', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tripId: 42,
    email: 'friend@example.com',
    canEdit: true
  })
});

const share = await response.json();
```

**Behavior:**
- If the trip is already shared with the user, the permissions are updated
- If it's a new share, a new record is created
- Email lookup is case-sensitive

---

### 3. Remove Share Access

Remove a user's access to a shared trip.

**Endpoint:** `DELETE /api/trips/share`

**Query Parameters:**
- `id` (required): The share ID (not the trip ID)

**Authorization:**
- Must be the trip owner OR the user the trip was shared with
- Both can remove the share

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Error Responses:**

- `401 Unauthorized` - User not logged in
- `400 Bad Request` - Missing id parameter
- `404 Not Found` - Share does not exist
- `403 Forbidden` - User doesn't have permission to remove this share

**Example:**
```javascript
const response = await fetch('/api/trips/share?id=125', {
  method: 'DELETE'
});

const result = await response.json();
```

**Use Cases:**
- Trip owner revokes access
- Shared user declines/leaves the shared trip

---

## Database Schema

### Table: `trip_shares`

```sql
CREATE TABLE trip_shares (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_user_idx ON trip_shares(trip_id, shared_with_user_id);
```

**Fields:**
- `id`: Unique identifier for the share
- `trip_id`: Reference to the shared trip
- `shared_with_user_id`: User receiving access
- `shared_by_user_id`: User who created the share
- `can_edit`: Permission level (false = view only, true = can edit)
- `created_at`: When the share was created

**Constraints:**
- Cascading deletes: If trip or user is deleted, shares are automatically removed
- Index on (trip_id, shared_with_user_id) for fast lookups

---

## Permission Levels

### View Only (`canEdit: false`)
- View all trip details
- See locations, transport, timing
- Cannot modify anything
- Cannot share with others
- Ideal for: Sharing itineraries, recommendations

### Can Edit (`canEdit: true`)
- All view permissions
- Add/remove locations
- Modify transport details
- Change durations and timing
- Update trip name/description
- Cannot delete the trip
- Cannot manage share settings
- Ideal for: Collaborative planning

### Owner (implicit)
- All edit permissions
- Delete the trip
- Manage share settings
- Remove user access
- Transfer ownership (future feature)

---

## Integration Examples

### React/Svelte Component

```typescript
// Share a trip
async function shareTrip(tripId: number, email: string, canEdit: boolean) {
  try {
    const response = await fetch('/api/trips/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, email, canEdit })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to share trip:', error);
    throw error;
  }
}

// Load shared users
async function loadSharedUsers(tripId: number) {
  const response = await fetch(`/api/trips/share?tripId=${tripId}`);
  return await response.json();
}

// Remove access
async function removeAccess(shareId: number) {
  const response = await fetch(`/api/trips/share?id=${shareId}`, {
    method: 'DELETE'
  });
  return await response.json();
}
```

### Usage in UI

```svelte
<script lang="ts">
  let tripId = 42;
  let sharedUsers = [];
  let newEmail = '';
  let canEdit = false;
  
  async function loadUsers() {
    sharedUsers = await loadSharedUsers(tripId);
  }
  
  async function handleShare() {
    await shareTrip(tripId, newEmail, canEdit);
    await loadUsers();
    newEmail = '';
  }
  
  onMount(loadUsers);
</script>

<input bind:value={newEmail} placeholder="Email" />
<label>
  <input type="checkbox" bind:checked={canEdit} />
  Can edit
</label>
<button on:click={handleShare}>Share</button>

{#each sharedUsers as user}
  <div>
    {user.userName} - {user.canEdit ? 'Can edit' : 'View only'}
    <button on:click={() => removeAccess(user.id)}>Remove</button>
  </div>
{/each}
```

---

## Security Considerations

### Authentication
- All endpoints require valid session
- No public access to trip sharing

### Authorization
- Trip ownership is always verified
- Cannot modify shares for trips you don't own
- Cannot share with non-existent users

### Data Privacy
- Email addresses are only visible to trip owners
- Shared users only see trip data, not owner's personal info
- Deleted trips cascade delete all shares

### Best Practices
1. Validate email format on client-side
2. Handle all error responses appropriately
3. Implement loading states
4. Confirm before removing access
5. Show clear permission indicators
6. Rate limit share requests (recommended)

---

## Rate Limiting (Recommended)

Consider implementing:
```typescript
// Example rate limit: 10 shares per minute per user
const RATE_LIMIT = {
  shares: 10,
  window: 60000 // ms
};
```

This prevents abuse while allowing legitimate collaborative planning.

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Trip Sharing API', () => {
  it('should share trip with valid email', async () => {
    const response = await shareTrip(1, 'test@example.com', false);
    expect(response).toHaveProperty('id');
    expect(response.canEdit).toBe(false);
  });
  
  it('should prevent sharing with self', async () => {
    await expect(
      shareTrip(1, 'owner@example.com', false)
    ).rejects.toThrow('cannot share with yourself');
  });
  
  it('should update existing share', async () => {
    await shareTrip(1, 'test@example.com', false);
    const updated = await shareTrip(1, 'test@example.com', true);
    expect(updated.canEdit).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Share Permissions', () => {
  it('should allow owner to share', async () => {
    const share = await ownerClient.shareTrip(tripId, 'user@test.com');
    expect(share).toBeDefined();
  });
  
  it('should prevent non-owner from sharing', async () => {
    await expect(
      nonOwnerClient.shareTrip(tripId, 'another@test.com')
    ).rejects.toThrow('403');
  });
  
  it('should allow shared user to view trip', async () => {
    await ownerClient.shareTrip(tripId, sharedUser.email);
    const trip = await sharedUserClient.getTrip(tripId);
    expect(trip).toBeDefined();
  });
});
```

---

## Error Handling

### Client-Side Error Handler

```typescript
async function handleShareError(error: Error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('unauthorized')) {
    return 'Please log in to share trips';
  }
  if (message.includes('not found')) {
    return 'Trip or user not found. Check the email address.';
  }
  if (message.includes('forbidden')) {
    return 'Only the trip owner can share this trip';
  }
  if (message.includes('yourself')) {
    return 'You cannot share a trip with yourself';
  }
  
  return 'Failed to share trip. Please try again.';
}
```

---

## Future Enhancements

### Planned Features
- [ ] Share notifications via email
- [ ] Share groups (share with multiple users at once)
- [ ] Share templates (preset permission groups)
- [ ] Share expiration dates
- [ ] Share analytics (view tracking)
- [ ] Transfer ownership
- [ ] Pending invitations system

### API Extensions
```typescript
// Future endpoints
POST /api/trips/share/bulk        // Share with multiple users
POST /api/trips/share/notify      // Send email notification
GET  /api/trips/share/pending     // Get pending invitations
POST /api/trips/share/accept      // Accept shared trip invitation
PUT  /api/trips/share/permissions // Batch update permissions
POST /api/trips/transfer-ownership // Transfer trip ownership
```

---

## Support

For API questions or issues:
- GitHub Issues: [link]
- Documentation: [link]
- API Status: [link]

---

**API Version:** 1.0  
**Last Updated:** 2024  
**Stability:** Stable
