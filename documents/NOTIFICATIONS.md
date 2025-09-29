# Notification System Implementation

This document explains how to implement and use the notification system for both web and PWA in your AnRye application.

## Overview

The notification system provides:
- **Web Notifications**: Browser-based notifications when the app is open
- **PWA Notifications**: Background notifications when the app is closed
- **Push Notifications**: Server-sent notifications via service worker
- **Background Sync**: Automatic data synchronization

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │  Service Worker  │    │   Server API    │
│                 │    │                  │    │                 │
│ • useNotifications │◄──►│ • Push Events    │◄──►│ • Send Notifications│
│ • NotificationService│    │ • Background Sync│    │ • Store Subscriptions│
│ • Components     │    │ • Notification   │    │                 │
│                 │    │   Click Handling │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. NotificationService (`app/lib/notificationService.ts`)

Core service that handles:
- Permission management
- Notification creation and display
- Service worker registration
- Push subscription management

```typescript
import { notificationService } from '@/app/lib/notificationService';

// Request permission
const granted = await notificationService.requestPermission();

// Show notification
await notificationService.showNotification({
  title: 'Hello World',
  body: 'This is a test notification',
  icon: '/icons/icon-192x192.png'
});
```

### 2. useNotifications Hook (`app/lib/hooks/useNotifications.ts`)

React hook that provides notification functionality:

```typescript
import { useNotifications } from '@/app/lib/hooks/useNotifications';

function MyComponent() {
  const {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showCalendarNotification,
    showNoteNotification,
    showSyncNotification
  } = useNotifications();

  // Use notification functions...
}
```

### 3. NotificationSettings Component (`app/components/NotificationSettings.tsx`)

Settings UI for users to configure notification preferences:

```typescript
import NotificationSettings from '@/app/components/NotificationSettings';

// Use in your settings page
<NotificationSettings />
```

### 4. Service Worker (`public/sw.js`)

Handles:
- Push notification events
- Background sync
- Notification click handling
- Offline functionality

## Usage Examples

### Basic Notification

```typescript
import { useNotifications } from '@/app/lib/hooks/useNotifications';

function MyComponent() {
  const { showNotification, permission, requestPermission } = useNotifications();

  const handleNotify = async () => {
    if (!permission.granted) {
      await requestPermission();
    }
    
    await showNotification({
      title: 'New Message',
      body: 'You have a new message from John',
      icon: '/icons/icon-192x192.png',
      tag: 'message'
    });
  };

  return <button onClick={handleNotify}>Send Notification</button>;
}
```

### Calendar Event Notification

```typescript
const { showCalendarNotification } = useNotifications();

// Show calendar event notification
await showCalendarNotification(
  'Team Meeting',
  new Date('2024-01-15T10:00:00'),
  false // isReminder
);
```

### Note Update Notification

```typescript
const { showNoteNotification } = useNotifications();

// Show note update notification
await showNoteNotification(
  'My Important Note',
  'updated' // action: 'created' | 'updated' | 'shared'
);
```

### Sync Status Notification

```typescript
const { showSyncNotification } = useNotifications();

// Show sync success
await showSyncNotification('success', 'Data synced successfully');

// Show sync error
await showSyncNotification('error', 'Sync failed. Please check connection.');
```

### Scheduled Reminder

```typescript
const { showReminderNotification } = useNotifications();

// Schedule a reminder for 1 hour from now
const reminderTime = new Date();
reminderTime.setHours(reminderTime.getHours() + 1);

await showReminderNotification(
  'Take a break',
  'You\'ve been working for an hour!',
  reminderTime
);
```

## API Endpoints

### POST `/api/notifications/subscribe`

Subscribe to push notifications:

```typescript
const subscription = await subscribeToPushNotifications(registration);
await fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(subscription)
});
```

### POST `/api/notifications/send`

Send push notification to all subscribers:

```typescript
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Server Notification',
    body: 'This is sent from the server',
    icon: '/icons/icon-192x192.png'
  })
});
```

### POST `/api/sync`

Background sync endpoint:

```typescript
// Called automatically by service worker
await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
```

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your_email@example.com
```

#### Generating VAPID Keys

To generate VAPID keys for push notifications, you can use the `web-push` library:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output something like:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa40HI8l8b7V1S1pfJCNFZDNX0bfyZJ2uH3L1x8wx8g21ULJfotNg3f2ZM9M

Private Key:
yfWPiYE-Nibc-Dku3qyyy1mFdDFzRTJvP8Vf7TZ2GYs

=======================================
```

Copy the public key to `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key to `VAPID_PRIVATE_KEY` in your `.env.local` file.

### PWA Manifest

Ensure your `public/manifest.json` includes notification permissions:

```json
{
  "name": "AnRye",
  "short_name": "AnRye",
  "display": "standalone",
  "permissions": ["notifications"]
}
```

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited support (iOS 16.4+)
- **Edge**: Full support

## Testing

Use the `NotificationDemo` component to test different notification types:

```typescript
import NotificationDemo from '@/app/components/NotificationDemo';

// Add to your test page
<NotificationDemo />
```

## Best Practices

1. **Request Permission Contextually**: Ask for notification permission when users perform relevant actions
2. **Provide Value**: Only send notifications that provide value to users
3. **Respect User Preferences**: Honor user notification settings
4. **Handle Errors Gracefully**: Always handle permission denied and other errors
5. **Test Thoroughly**: Test on different browsers and devices
6. **Use Appropriate Icons**: Use clear, recognizable icons for notifications
7. **Limit Frequency**: Don't spam users with too many notifications

## Troubleshooting

### Common Issues

1. **Notifications not showing**: Check browser permissions and HTTPS requirement
2. **Service worker not registering**: Ensure proper file paths and HTTPS
3. **Push notifications not working**: Verify VAPID keys and subscription handling
4. **Background sync failing**: Check network connectivity and API endpoints

### Debug Tools

- Use browser DevTools > Application > Service Workers
- Check notification permissions in DevTools > Application > Notifications
- Monitor network requests for API calls
- Use `console.log` in service worker for debugging

## Security Considerations

1. **HTTPS Required**: Notifications only work over HTTPS in production
2. **VAPID Keys**: Keep VAPID private key secure
3. **User Data**: Don't include sensitive data in notification payloads
4. **Rate Limiting**: Implement rate limiting for notification sending
5. **User Consent**: Always get explicit user consent before sending notifications

## Future Enhancements

- Rich notifications with images and actions
- Notification scheduling and recurring reminders
- Notification analytics and tracking
- Integration with external notification services
- Advanced notification filtering and categorization
