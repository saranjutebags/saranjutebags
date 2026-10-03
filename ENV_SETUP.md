# Environment Variables Setup

Create a `.env` file in the project root with the following variables:

## Firebase Configuration (REQUIRED for login to work)
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## OneSignal Configuration (Optional - for push notifications)
```
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id
VITE_ONESIGNAL_API_KEY=your_onesignal_api_key
```

## EmailJS Configuration (REQUIRED for order status emails)
```
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=ervsice_xxxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxxx
```

## Firebase Admin / Server-Side Stock (REQUIRED for stock updates in production)

Customer stock changes are applied by the serverless function `api/update-stock.js`
using the Firebase Admin SDK, so a browser can never write an inventory number.
That function needs a service account key.

```
FIREBASE_SERVICE_ACCOUNT={"project_id":"your_project_id","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@your_project.iam.gserviceaccount.com",...}
```

Setup:
1. Firebase Console → Project settings → Service accounts → **Generate new private key**
2. Open the downloaded JSON and copy it **exactly as-is** (keep the `\n` escapes in `private_key`)
3. Vercel → your project → Settings → Environment Variables → add
   `FIREBASE_SERVICE_ACCOUNT` (Production, Preview and Development) with that JSON
4. This variable must **never** be prefixed with `VITE_` — it would leak the key to the browser
5. Redeploy after saving

## Getting the Values

### Firebase (REQUIRED - Without this, login will not work)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project
3. Go to Project Settings → General → Your apps
4. Register a web app and copy the configuration values
5. **IMPORTANT**: You must create the user `saranjutebags@gmail.com` in Firebase Authentication with password `yourpassword`
6. Publish `firestore.rules` (Firebase Console → Firestore → Rules) — it must ship
   together with the app code, because the rules and the client writes are designed
   around each other
7. For extra admin hardening, set the custom claim `admin: true` on the admin user
   with the Admin SDK; the rules accept either that claim or the owner email

### OneSignal
1. Go to [OneSignal Dashboard](https://onesignal.com/)
2. Create/select your app
3. Go to Settings → Keys & IDs
4. Copy the App ID and REST API Key

### EmailJS (REQUIRED for order notifications)
1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Create an account or sign in
3. Go to Account → General → Copy your Public Key
4. The Service ID and Template ID are pre-configured in the code:
   - Service ID: `service_xxxxxxxx`
   - Template ID: `template_xxxxx`
5. Add your Public Key to the `.env` file




## Troubleshooting
- If the page is empty: Firebase environment variables are missing
- If login fails: Firebase credentials are incorrect OR user not created in Firebase Auth
- If order emails don't send: EmailJS public key is missing
- If stock does not drop after checkout: `FIREBASE_SERVICE_ACCOUNT` is missing on Vercel
  (check the `/api/update-stock` response in the browser network tab)
- After adding .env variables: Restart the dev server (Ctrl+C, then npm run dev)
