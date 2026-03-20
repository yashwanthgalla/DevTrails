# GigGuard AI Frontend

GigGuard AI is a frontend-first platform for delivery agents.
Agents can start orders, select start and destination points on map, complete deliveries with photo proof, and admins can monitor users, orders, and payout due.

This setup does not require Spring Boot, STS, or MySQL.

## What This Project Includes

1. Firebase Authentication with role-based access.
2. Firestore-based RBAC using users collection.
3. Agent dashboard with map point selection for start and destination.
4. Live location tracking while order is active.
5. Delivery completion with camera proof at destination.
6. Admin portal with:
  - agent user details
  - all completed order records
  - weekly payout due per agent
7. Weather risk monitoring using OpenWeather.

## Architecture

1. Frontend: React + TypeScript + Vite + Tailwind + React Router.
2. Auth: Firebase Auth (Email/Password).
3. Database: Cloud Firestore.
4. Media storage: Cloudinary (recommended for proof photos).

Note:
The current flow stores proof photo preview in app state and writes order metadata to Firestore.
For production media storage, use Cloudinary upload and save URL/public_id in Firestore.

## Roles and Access

1. Public users can register and are created as client.
2. Admin users are created manually and assigned role = admin in Firestore.
3. Route access:
  - client: dashboard and payment route
  - admin: admin route

## Firestore Collections Used

1. users
  - user profile and role
2. agent_orders
  - completed delivery records for admin monitoring
3. verification_records
  - verification history used by admin portal

## Routes

1. / : Home
2. /login : Login and Register
3. /dashboard : Client dashboard
4. /payment : Payment section (currently marked Coming Soon)
5. /admin : Admin portal

## Setup

1. Install dependencies
  npm install

2. Start development server
  npm run dev

3. Build
  npm run build

4. Lint
  npm run lint

## Environment Variables

Use file: [frontend/.env.example](frontend/.env.example)

Required Firebase and weather variables:

1. VITE_OPENWEATHER_API_KEY
2. VITE_FIREBASE_API_KEY
3. VITE_FIREBASE_AUTH_DOMAIN
4. VITE_FIREBASE_PROJECT_ID
5. VITE_FIREBASE_STORAGE_BUCKET
6. VITE_FIREBASE_MESSAGING_SENDER_ID
7. VITE_FIREBASE_APP_ID
8. VITE_FIREBASE_MEASUREMENT_ID

Recommended Cloudinary variables:

1. VITE_CLOUDINARY_CLOUD_NAME
2. VITE_CLOUDINARY_UPLOAD_PRESET
3. VITE_CLOUDINARY_FOLDER

## Firebase Rules

Publish Firestore rules from:
[frontend/firestore.rules.example](frontend/firestore.rules.example)

Important:

1. users/{uid}.role controls RBAC.
2. New public users can only create role = client.
3. Admin role must be set manually for admin accounts.

## How To Enable Admin

1. Create admin user in Firebase Authentication.
2. Create Firestore document users/{uid} with:
  - uid
  - email
  - fullName
  - role = admin
  - createdAtMs
3. Logout and login again to load admin role.

## Cloudinary Plan

For production proof image storage:

1. Upload image to Cloudinary when order is completed.
2. Store returned secure_url and public_id inside agent_orders document.
3. Show Cloudinary URL in admin order details.

## Notes

1. Payment section is intentionally marked Coming Soon.
2. Chunk-size build warning from Vite is informational and not a build failure.
