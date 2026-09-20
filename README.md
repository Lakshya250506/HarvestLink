# 🍃 HarvestLink: Tech for a Better Tomorrow
**Bridge the gap between surplus & starvation.**

Every day, local restaurants, messes, and event venues discard massive amounts of edible surplus food, while nearby shelters and NGOs struggle with food insecurity. Traditional food rescue coordination suffers from high friction: it relies on fragmented phone calls or clunky web dashboards that exhausted restaurant staff refuse to use at closing time, leading to thousands of meals needlessly ending up in landfills without accountability or audit logs.

**HarvestLink** is a secure, real-time, zero-cost, two-sided food rescue platform built under the "Tech for a Better Tomorrow" theme. Operating with a high-performance client-side interface backed by **Firebase Realtime Database**, HarvestLink delivers an end-to-end trusted workflow.

---

### 🚀 Key Features & Architecture

* **Role-Based Authentication & Session Lock:** Multi-step portal sign-in. User identities are securely locked per tab via `sessionStorage` to prevent shared-session conflicts between multiple accounts.
* **Branch-Aware Multi-Location Support:** Supports restaurant chains and multi-branch venues. Each location is uniquely identified by combining its name and address, ensuring that distinct branches maintain separate metrics, active listings, and audit logs.
* **Supply-Driven (Push) Model:** Restaurants post surplus food details, categories, quantities, spoil timers, and contact info instantly.
* **Strict Input Validation & Constraints:** Enforces strict 10-digit mobile number formatting and positive quantity checks to maintain data integrity across the network.
* **NGO Discovery & Routing:** NGOs view a live feed with crash-proof filtering, check transit times via Google Maps directions, and claim items.
* **Closed-Loop OTP Verification:** Claiming an item generates a secure 4-digit OTP shown in an "Active Pickups" dashboard. Restaurants verify this OTP inline to finalize orders, moving items into separate restaurant and NGO JSON audit logs ("Past Orders/Collections").

---

### 💻 Tech Stack
* **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
* **Database / Sync:** Firebase Realtime Database (Real-time cloud synchronization)
* **Deployment:** GitHub Pages / Serverless Hosting

---

### 🧪 How to Test & Demo Locally
To experience the real-time cloud sync in action:
1. Open the application link or run it locally via Live Server.
2. Log in as a **Restaurant** (enter a name, a valid 10-digit mobile number, and branch address) and broadcast a surplus food item.
3. Open a separate tab or device, log in as an **NGO**, and watch the live food feed update instantly without refreshing.
4. Claim the item as the NGO to generate the secure 4-digit OTP, then verify it on the Restaurant side to complete the loop!

---

### 📦 Project Structure
```text
├── index.html       # Main application layout and multi-view portal markup
├── style.css        # Custom dark-theme styling and animations
└── app.js           # Firebase integration, auth routing, and portal logic
