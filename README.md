# 🎁 Spinner — Gift Exchange App

> A premium, mobile-first gift exchange pairing web app built for **Akosua Betty Ministries**. Members spin a wheel to be randomly paired with another participant, then choose to send a MoMo payment or a physical gift.

---

## ✨ Features

- 🎡 **Spin the Wheel** — Random pairing with smooth animation and drag-to-spin support
- 🔒 **One Spin Per Event** — Each member can only spin once; results are locked and synced to the cloud
- 💛 **MoMo Integration** — Tap "Send MoMo" to open the phone dialer directly to your paired person
- 🎁 **Gift Type Tracking** — Members select MoMo or Physical Gift; choice is saved to Google Sheets in real time
- 📤 **Branded Image Sharing** — Share your pairing result as a branded image to WhatsApp and other apps
- 🔄 **Cross-Device Sync** — Pairing and gift type syncs via Google Sheets, works on any device
- 🛡️ **Admin Dashboard** — Manage users, events, pairings, and view all gift type selections
- 🔑 **Secure Login** — Password-based login with change-password support

---

## 🗂️ Project Structure

```
Spinner/
├── app/
│   ├── app.js              # Main app entry point & share logic
│   ├── auth/
│   │   ├── admin.js        # Admin dashboard logic
│   │   └── login.js        # User login, auth, and alert system
│   ├── ui/
│   │   ├── result.js       # Pairing result card rendering
│   │   ├── toast.js        # Toast notification system
│   │   └── branding.js     # Logo & branding helpers
│   └── wheel/
│       ├── draw.js         # Canvas wheel drawing
│       ├── drag.js         # Drag-to-spin gesture handling
│       ├── spin.js         # Spin physics & winner determination
│       └── state.js        # Shared global state
├── db/
│   └── data.js             # Google Sheets API layer (fetch users, save pairings)
├── styles/
│   ├── base/               # Layout, typography, variables
│   ├── components/         # Buttons, sidebar, modals, wheel
│   └── utils/              # Helpers, animations
├── media/                  # Images and logos
└── index.html              # Single-page app entry point
```

---

## ⚙️ Setup & Deployment

This is a **pure HTML/CSS/JavaScript** app — no build step required.

### Local Development
1. Serve with any static file server, e.g.:
   ```bash
   npx serve .
   # or
   python3 -m http.server 5500
   ```
2. Open `http://localhost:5500` in your browser.

### Google Apps Script Backend
The app syncs data via a deployed **Google Apps Script** proxy. You'll need:
- A **Google Sheet** for users (Form Responses)
- A **Google Sheet** for admins (pairings, events)
- A deployed Apps Script web app — see `db/data.js` for the expected payload format

### Deployment
Deploy by hosting `index.html` and all assets on any static host (GitHub Pages, Netlify, Vercel, etc.).

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (ES Modules) |
| Data Layer | Google Sheets + Google Apps Script |
| Image Sharing | `html2canvas` + Web Share API |
| Fonts | Google Fonts — Outfit |
| Auth | Phone-number + password (stored in Google Sheet) |

---

## 🏢 Credits

**Built by:** [DivAmok Corp.](https://divamok.com)  
**For:** Akosua Betty Ministries  
**Year:** 2026

---

> *"Generosity is the seed of community."* 🕊️
