🍽️ Bistrot Bastards — Open-Source Tools for the Hospitality Industry

Bistrot Bastards is an open-source initiative building digital tools for restaurants, cafés, and bars — designed to make hospitality work visible, rewarding, and fun again.

We build small, beautiful web apps that celebrate the people behind the service industry: waiters, bartenders, cooks, hosts, dishwashers — the real backbone of everyday joy.

⸻

💡 Vision

Hospitality is culture.
Yet most service jobs remain invisible, underpaid, and digitally underserved.

Our mission is to re-enchant hospitality through transparent, human-centered, and open digital infrastructure —
so that recognition, feedback, and pride in one's craft can circulate as easily as tips and smiles.

⸻

🧩 What We're Building

A modular ecosystem of web-based tools, all open-source and easy to deploy:
	•	🧑‍🍳 Server profiles & leaderboards — celebrate the people behind great experiences.
	•	🏅 Performance dashboards — fair, data-driven scoring models (like Bistrot Podium V1.3) to visualize progress.
	•	💬 Team chats & feedback loops — real-time communication that replaces WhatsApp chaos.
	•	📊 Manager tools — transparent dashboards for HR, satisfaction, and motivation.
	•	💸 Optional QR tipping — a lightweight, wallet-based tipping system that lets guests reward staff directly.

Every feature is modular and designed for remixing — restaurants, developers, or students can fork, adapt, and build on top of it.

⸻

🧠 Philosophy

Open, local, transparent.
We believe in open-source hospitality: technology that belongs to the community, not to a platform.
	•	100 % web-based (HTML / CSS / JS + Firebase)
	•	Works on any device — no app needed
	•	Data stays in your hands
	•	Designed to be hacked, forked, and improved

⸻

🪄 Culture

"Hospitality is not a job — it's an ecosystem."

Bistrot Bastards is part social experiment, part design lab, part tribute to everyone who makes daily life taste better.
Our code is open, our tools are free, and our tone is joyful.

⸻

📁 Repository Structure

```
bistrotbastards/
├── index.html              # Entry point (redirects to login)
├── CNAME                   # GitHub Pages custom domain
├── LICENSE                 # License file
├── .gitignore              # Git ignore rules
├── .nojekyll               # Disable Jekyll processing
│
├── assets/
│   └── images/             # SVG avatars and images
│       ├── avatar-pup-orange.svg
│       └── avatar-pup-red.svg
│
└── src/
    ├── pages/              # HTML pages
    │   ├── auth/
    │   │   ├── login.html
    │   │   └── signup.html
    │   ├── waiter/
    │   │   ├── home.html
    │   │   ├── profile.html
    │   │   ├── tips.html
    │   │   ├── reviews.html
    │   │   └── crypto-tips.html
    │   ├── shared/
    │   │   └── chat.html
    │   └── admin/
    │       └── dashboard.html
    │
    ├── scripts/            # JavaScript modules
    │   ├── core/           # Core utilities
    │   │   ├── config.js
    │   │   ├── firebase.js
    │   │   ├── auth-guard.js
    │   │   ├── navigation.js
    │   │   └── utils.js
    │   ├── features/       # Feature modules
    │   │   └── leaderboard.js
    │   └── pages/          # Page-specific scripts
    │       ├── login.js
    │       ├── signup.js
    │       ├── waiter-profile.js
    │       ├── waiter-crypto-tips.js
    │       ├── chat.js
    │       └── admin.js
    │
    └── styles/             # CSS stylesheets
        ├── system7.css
        ├── navigation.css
        ├── auth.css
        ├── waiter-home.css
        ├── waiter-profile.css
        ├── waiter-tips.css
        ├── waiter-crypto.css
        └── chat.css
```

⸻

🚀 Deployment

This site is deployed on **GitHub Pages** at [bistrotbastards.com](https://bistrotbastards.com).

To deploy your own instance:
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Point to the `main` branch
4. Configure your custom domain in `CNAME` (optional)

⸻

🔧 Tech Stack

- **Frontend:** Pure HTML, CSS, and vanilla JavaScript (ES6 modules)
- **Backend:** Firebase (Authentication, Firestore, Realtime Database)
- **Hosting:** GitHub Pages
- **Design:** Custom System 7-inspired UI with pastel palette

⸻

🧩 Learn More / Contribute

Check out the repo → [github.com/bistrotbastards](https://github.com/bistrotbastards)
Fork it, break it, make it better — that's the spirit.
