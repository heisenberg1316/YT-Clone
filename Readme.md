# 🎬 YT-Clone

A full-stack YouTube clone built with modern web technologies, focused on performance, scalability, and developer experience.

---

## 🚀 Tech Stack

* **Framework:** Next.js 15 + React 19
* **Runtime:** Bun
* **Database:** PostgreSQL + Drizzle ORM
* **API Layer:** tRPC
* **Styling:** Tailwind CSS + shadcn/ui

---

## ⚙️ Integrations

* 🎥 Video Storage & Processing: Mux
* 🔄 Background Workflows: Upstash
* 🔐 Authentication & Security: Clerk
* 🌐 Webhook Testing: ngrok

---

## ✨ Key Features

* 🎥 Advanced video player with quality controls
* 🎬 Real-time video processing with Mux
* 📝 Automatic video transcription
* 🖼️ Smart thumbnail generation
* 🤖 AI-powered title and description generation
* 📊 Creator Studio with analytics & metrics
* 🗂️ Custom playlist management
* 📱 Fully responsive design
* 🔄 Multiple dynamic content feeds
* 💬 Interactive comment system
* 👍 Like & subscription system
* 🎯 Watch history tracking
* 🔐 Secure authentication system
* 📦 Scalable module-based architecture

---

## 📁 Project Structure

```bash
YT-CLONE/
  README.md
  new-tube/   # Main application
```

---

## 🛠️ Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/YT-Clone.git
cd YT-Clone/new-tube
```

### 2️⃣ Install dependencies

```bash
bun install
```

### 3️⃣ Run the development server

```bash
bun run dev
```

---

## 🌐 Webhook Development (Mux / Background Jobs)

To test webhooks locally using ngrok:

```bash
bun run dev:webhook
```

If that doesn’t work, fallback to:

```bash
npm run dev:webhook
```

---

## 📜 Available Scripts

```json
"dev": "next dev",
"dev:webhook": "ngrok http --url=your_ngrok_tunnel_url 3000",
"build": "next build",
"start": "next start",
```

---

## 🚀 Deployment

Deployed on Vercel

⚠️ Important:
If deploying with the current structure, set:

```
Root Directory → new-tube
```

---

## 💡 Notes

* Uses Bun for faster installs and execution
* Uses ngrok for local webhook testing
* Designed with scalability and modularity in mind

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo and submit a PR.

---

## 📄 License

This project is for educational purposes.
