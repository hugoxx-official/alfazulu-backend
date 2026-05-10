import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let messaging = null;

// Initialize Firebase Admin SDK
export function initFirebasePush() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin already initialized');
      messaging = admin.messaging();
      return messaging;
    }

    // Try to initialize with service account file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      messaging = admin.messaging();
      console.log('Firebase Admin initialized with service account');
      return messaging;
    } catch (fileError) {
      console.log('Service account file not found, using environment variables');

      // Fallback to environment variables (for Railway deployment)
      if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        messaging = admin.messaging();
        console.log('Firebase Admin initialized with application default credentials');
        return messaging;
      }

      console.warn('Firebase credentials not configured. Push notifications disabled.');
      return null;
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    return null;
  }
}

// Send push notification to a specific device token
export async function sendPushNotification(deviceToken, title, body, data = {}) {
  if (!messaging) {
    console.warn('Firebase not initialized, skipping push notification');
    return { success: false, reason: 'firebase_not_initialized' };
  }

  try {
    const message = {
      notification: {
        title,
        body
      },
      data,
      token: deviceToken,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          color: '#FF003C',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await messaging.send(message);
    console.log('Successfully sent push notification:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending push notification:', error.message);

    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, reason: 'invalid_token', error: error.message };
    }

    return { success: false, reason: 'send_error', error: error.message };
  }
}

// Send push notification to multiple devices (topic)
export async function sendPushToTopic(topic, title, body, data = {}) {
  if (!messaging) {
    console.warn('Firebase not initialized, skipping push notification');
    return { success: false, reason: 'firebase_not_initialized' };
  }

  try {
    const message = {
      notification: {
        title,
        body
      },
      data,
      topic,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          color: '#FF003C',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await messaging.send(message);
    console.log('Successfully sent push to topic:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending push to topic:', error.message);
    return { success: false, error: error.message };
  }
}

// Send push notification to multiple tokens (batch)
export async function sendPushToMultiple(tokens, title, body, data = {}) {
  if (!messaging) {
    console.warn('Firebase not initialized, skipping push notification');
    return { success: false, reason: 'firebase_not_initialized' };
  }

  try {
    const messages = tokens.map(token => ({
      notification: {
        title,
        body
      },
      data,
      token,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          color: '#FF003C',
          sound: 'default'
        }
      }
    }));

    const batchResponse = await messaging.sendEach(messages);
    console.log(`Successfully sent ${batchResponse.successCount} of ${tokens.length} push notifications`);
    return {
      success: batchResponse.successCount > 0,
      successCount: batchResponse.successCount,
      failureCount: batchResponse.failureCount,
      responses: batchResponse.responses
    };
  } catch (error) {
    console.error('Error sending batch push notifications:', error.message);
    return { success: false, error: error.message };
  }
}

export { messaging };
