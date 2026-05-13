# 🛡️ SafeHer AI — Women's Safety & Threat Analysis Platform

> **Built for a hackathon** | Real-time AI-powered threat detection and emergency response for women's safety

[![JavaScript](https://img.shields.io/badge/JavaScript-63.7%25-F7DF1E?logo=javascript&logoColor=black)](https://github.com/codebyraunak/safe-her-ai)
[![Python](https://img.shields.io/badge/Python-35.2%25-3776AB?logo=python&logoColor=white)](https://github.com/codebyraunak/safe-her-ai)
[![React](https://img.shields.io/badge/Frontend-React.js-61DAFB?logo=react&logoColor=black)](https://github.com/codebyraunak/safe-her-ai)
[![Flask](https://img.shields.io/badge/Backend-Flask-000000?logo=flask)](https://github.com/codebyraunak/safe-her-ai)

---

## 💡 The Problem

Women face safety risks daily — in transit, unfamiliar areas, or dangerous situations. Most existing safety apps require **manual activation**, which is often impossible in a real emergency.

## ✅ Our Solution

**SafeHer AI** is a full-stack intelligent safety platform that **automatically detects threats** using real-time audio analysis, GPS tracking, and AI-driven risk prediction — no manual input needed. It classifies threats into 3 levels and triggers emergency responses instantly.

---

## 🎥 Demo

> _Add your demo video / live link here_

---

## ⚡ Key Features

| Feature | Description |
|---|---|
| 🔊 **Audio Threat Detection** | ML models detect distress signals — screams, panic voices, aggressive sounds |
| 📍 **GPS Live Tracking** | Continuously monitors location; flags unexpected stops or entry into unknown areas |
| 🗺️ **SafeMap** | Real-time risk-zone map powered by historical incident data |
| 🤖 **SafeBot** | AI chatbot for guided safety protocols and emergency support |
| 🚨 **Auto SOS** | Instantly alerts emergency contacts with location when a threat is detected |
| 📊 **Threat Level Classification** | Scores safety status as **Low / Medium / High** using fused AI signals |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User (Mobile/Web)                 │
└────────────────────────┬────────────────────────────┘
                         │  Audio + GPS Input
                         ▼
┌─────────────────────────────────────────────────────┐
│              Continuous Tracking Module              │
│   ┌─────────────────┐   ┌────────────────────────┐  │
│   │  Audio Analysis │   │   Location Tracking    │  │
│   │  (ML / Python)  │   │   (GPS Unit)           │  │
│   └────────┬────────┘   └───────────┬────────────┘  │
│            └──────────┬─────────────┘               │
│                       ▼                             │
│              Threat Level Engine                    │
│           (Low / Medium / High)                     │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   Auto SOS Trigger         SafeMap + SafeBot
   (Emergency Contacts)     (React.js Frontend)
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React.js, deployed on Vercel |
| **Backend** | Python, Flask, REST API |
| **ML / AI** | Audio classification, GPS anomaly detection |
| **Database** | MongoDB / MySQL |
| **Deployment** | Vercel (frontend) + Render / Railway (backend) |

---

