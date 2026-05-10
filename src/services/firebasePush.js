import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let messaging = null;

// Initialize Firebase Admin SDK
export function initFirebasePush() {
  console.log('initFirebasePush called');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'set' : 'not set');
  console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'set' : 'not set');
  console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'not set');

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin already initialized');
      messaging = admin.messaging();
      return messaging;
    }

    // Try to initialize with environment variables (Railway-friendly)
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    console.log('Service account config:', {
      project_id: serviceAccount.project_id,
      private_key: serviceAccount.private_key ? 'set (' + serviceAccount.private_key.length + ' chars)' : 'not set',
      client_email: serviceAccount.client_email
    });

    if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        messaging = admin.messaging();
        console.log('Firebase Admin initialized with env vars');
        return messaging;
      } catch (certError) {
        console.error('Error with cert credentials:', certError.message);
        console.error('Stack:', certError.stack);
      }
    }

    // Fallback: try to load from file (local development)
    try {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
      const fileAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(fileAccount)
      });
      messaging = admin.messaging();
      console.log('Firebase Admin initialized with service account file');
      return messaging;
    } catch (fileError) {
      console.log('Service account file not found:', fileError.message);
    }

    console.warn('Firebase credentials not configured. Push notifications disabled.');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    console.error('Stack:', error.stack);
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
  console.log(`sendPushToMultiple called with ${tokens.length} tokens`);

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

    console.log('Sending messages to FCM...');
    const batchResponse = await messaging.sendEach(messages);
    console.log(`FCM response: ${batchResponse.successCount}/${tokens.length} success`);

    return {
      success: batchResponse.successCount > 0,
      successCount: batchResponse.successCount,
      failureCount: batchResponse.failureCount,
      responses: batchResponse.responses
    };
  } catch (error) {
    console.error('Error sending batch push notifications:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

export { messaging };
