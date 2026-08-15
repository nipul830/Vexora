# Vexora — GitHub + Render Ready

A 3-page membership website with:
- Home → Plans → Payment flow
- Plans: 1 Day Free, 7 Days ₹999, 15 Days ₹1499, 30 Days ₹2499, Lifetime ₹11000
- Source Code: ₹35000 + GST
- UPI and Crypto payment sections
- UTR / transaction ID
- Payment screenshot upload
- TradingView username
- Telegram username with Telegram redirect
- Customer care WhatsApp
- Simple admin page for submitted payment requests

## Important
This is a test/deployment-ready starter. Payment approval is manual; no automatic payment verification is implemented.

## Deploy on Render
1. Push this repository to GitHub.
2. On Render, create a **Web Service** from the repository.
3. Choose **Docker** runtime (Render does not natively run PHP).
4. Deploy.
5. Open the generated `onrender.com` URL.

## Storage
For testing, submissions are stored locally. Render's free filesystem is ephemeral, so for production use a database/object storage and a persistent disk or external storage for screenshots.

## Configure
Edit `server.js` to change contact details and payment addresses.
