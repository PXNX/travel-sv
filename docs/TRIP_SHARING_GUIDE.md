# Trip Sharing User Guide

## How to Share Your Trip

### Method 1: Share Link (Quick & Easy)

Perfect for sharing with anyone, even if they don't have an account.

1. **Open your trip**
   - Click on the "Trips" tab in the sidebar
   - Select the trip you want to share

2. **Access the share menu**
   - Look for the Share icon (🔗) button next to the trip name
   - Click the Share button

3. **Copy the link**
   - The "Share Link" tab opens by default
   - Click the "Copy" button to copy the link to your clipboard
   - Paste and send the link via email, messaging apps, etc.

4. **Alternative: Use native sharing**
   - On mobile devices, you'll see a "Share via..." button
   - This opens your device's native share menu
   - Share directly to apps like WhatsApp, Email, etc.

**What recipients can do:**
- View the complete trip itinerary
- See all locations, timings, and transport details
- Import the trip to their own planner (feature coming soon)

---

### Method 2: Share with Specific Users

Best for collaborative planning with friends who have accounts.

> **Note:** This feature requires trips to be saved to your account (server-side storage). Currently being implemented.

1. **Open the share menu**
   - Click the Share button on your trip
   - Switch to the "Share with Users" tab

2. **Enter user email**
   - Type the email address of the person you want to share with
   - They must have a registered account

3. **Set permissions**
   - Leave unchecked for "View only" access
   - Check "Allow editing this trip" to let them:
     - Add or remove locations
     - Modify transport details
     - Change timings and durations

4. **Send the invitation**
   - Click "Share Trip"
   - The user will appear in the "Shared with" list
   - They can now access the trip from their account

5. **Manage access**
   - See all users the trip is shared with
   - Click the delete (🗑️) icon to remove someone's access
   - Edit permissions are shown with a badge

---

## Understanding Trip Types

### Local Trips (Browser Storage)
- **Icon:** String ID (e.g., "abc-123-def")
- **Storage:** Saved in your browser's localStorage
- **Sharing:** Link sharing only
- **Pros:** Works offline, no account needed
- **Cons:** Only on this device and browser

### Account Trips (Server Storage)  
- **Icon:** Numeric ID (e.g., 42)
- **Storage:** Saved to your account
- **Sharing:** Both link and user sharing
- **Pros:** Access from any device, collaborate with others
- **Cons:** Requires internet connection

> **Coming Soon:** Automatic sync between local and account trips

---

## Tips for Effective Sharing

### Creating Share-Worthy Trips
1. **Add descriptive names**
   - Good: "Weekend in Paris - Museums & Cafés"
   - Not ideal: "Trip 1"

2. **Include details**
   - Add transport information between stops
   - Note custom durations for activities
   - Write helpful notes in descriptions

3. **Organize stops logically**
   - Arrange locations in a sensible order
   - Group nearby attractions together
   - Consider timing and opening hours

### Sharing Best Practices

**For Link Sharing:**
- Include context in your message: "Check out my Berlin trip plan!"
- Mention the trip duration and highlights
- Let people know if it's a draft or finalized

**For User Sharing:**
- Use "View only" for sharing your plans
- Use "Can edit" when planning together
- Remove access when planning is complete

---

## Privacy & Security

### What's Included in Shared Links
- Trip name and description
- All locations with addresses and coordinates
- Transport information and timing
- Custom durations and notes

### What's NOT Included
- Your account information
- Other trips you've created
- Personal data or preferences
- Edit history

### Security Notes
- Shared links are encoded but not encrypted
- Anyone with the link can view the trip
- User sharing requires authentication
- You can revoke user access anytime
- Delete the trip to stop all sharing

---

## Troubleshooting

### "This trip is stored locally in your browser"
- This means you can only use link sharing
- To enable user sharing, trips need server storage
- Feature is being implemented

### "User not found with that email address"
- The person must have an account
- Check that the email is spelled correctly
- Ask them to sign up first

### Link doesn't work
- Ensure the entire URL was copied
- Try opening in an incognito/private window
- Check if the trip still exists

### Can't see shared trips
- Check your account's trip list
- Look for trips marked "Shared by [Name]"
- Ask the sender to verify the email address

---

## Examples

### Example 1: Planning a Group Trip
```
Scenario: Planning a Barcelona trip with 3 friends

1. Create your trip "Barcelona Weekend"
2. Add initial locations (hotels, key attractions)
3. Share with friends using their emails
4. Enable "Can edit" for all of them
5. Everyone adds their must-see places
6. Finalize the itinerary together
7. Share final version via link with the whole group
```

### Example 2: Sharing Your Past Trip
```
Scenario: Someone asked for your Japan trip recommendations

1. Open your completed "Tokyo Adventure" trip
2. Click Share → Share Link
3. Copy the link
4. Send with a message: "Here's my complete Tokyo itinerary!"
5. They can view all locations and transport details
```

### Example 3: Family Vacation Planning
```
Scenario: Planning a Disney trip with family

1. Create "Disney World 2024" trip
2. Research and add all parks, restaurants, hotels
3. Share view-only link with extended family for input
4. Share with edit access to your spouse
5. Finalize together
6. Share final version with everyone attending
```

---

## Keyboard Shortcuts

When the share modal is open:
- `Esc` - Close the modal
- `Tab` - Navigate between fields
- `Ctrl/Cmd + C` - Copy link (when selected)
- `Enter` - Submit share form

---

## Feature Roadmap

### Coming Soon
- [ ] Import trips from shared links
- [ ] Server-side trip storage sync
- [ ] Real-time collaborative editing
- [ ] Share notifications
- [ ] Permission management interface
- [ ] Public/Private trip toggle
- [ ] Share analytics (view count)

### Future Ideas
- [ ] Template trips for inspiration
- [ ] Trip comments and suggestions
- [ ] Version history
- [ ] Export to PDF/Calendar
- [ ] QR code sharing

---

## Need Help?

- Check the main documentation
- Report bugs via GitHub issues
- Suggest improvements in discussions
- Contact support at [your-email]

---

**Last Updated:** 2024
**Version:** 1.0.0
