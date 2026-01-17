<div align="center">

# TerminalWON Mobile App

### React Native App (Coming Soon)

[![React Native](https://img.shields.io/badge/React_Native-0.74-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)

</div>

---

## 🚧 Status: In Development

The React Native mobile app is planned for the **cloud-hosted version** of TerminalWON. For now, use the **PWA** (Progressive Web App) which provides a native app-like experience.

---

## 📱 Current Solution: PWA

The PWA is fully functional and available now:

1. Open `http://YOUR_IP:8080` on your phone
2. Add to Home Screen for app-like experience
3. Full terminal streaming and control

### PWA vs Native App

| Feature | PWA (Now) | Native App (Planned) |
|:---:|:---:|:---:|
| **Terminal streaming** | ✅ Full | ✅ Full |
| **Command input** | ✅ Full | ✅ Full |
| **AI chat history** | ✅ Full | ✅ Full |
| **Push notifications** | ❌ Limited | ✅ Full |
| **Background sync** | ❌ No | ✅ Yes |
| **App Store** | ❌ No | ✅ Yes |
| **Offline support** | ⚠️ Basic | ✅ Full |

---

## 🗓️ Planned Features

### Phase 1: Core Features
- [ ] Terminal list and streaming
- [ ] Command input with keyboard
- [ ] Quick action buttons (Y/N, Ctrl+C)
- [ ] AI chat history viewer

### Phase 2: Enhanced Experience
- [ ] Push notifications for long-running commands
- [ ] Background connection maintenance
- [ ] Offline queue for commands
- [ ] Biometric authentication

### Phase 3: Cloud Integration
- [ ] Cloud account login
- [ ] Team workspaces
- [ ] Terminal sharing
- [ ] Session recording playback

---

## 🏗️ Technical Stack

| Technology | Purpose |
|:---:|:---|
| **React Native** | Cross-platform mobile framework |
| **Expo** | Development and build tooling |
| **Zustand** | State management |
| **React Navigation** | Navigation |
| **WebSocket** | Real-time communication |

---

## 📂 Project Structure

```
mobile-app/
├── App.tsx                 # Entry point
├── src/
│   ├── screens/            # Screen components
│   ├── components/         # Reusable components
│   ├── hooks/              # Custom hooks
│   ├── store/              # Zustand stores
│   ├── services/           # API and WebSocket
│   └── utils/              # Utilities
├── assets/                 # Images, fonts
├── app.json                # Expo config
├── eas.json                # EAS Build config
└── package.json
```

---

## 🔧 Development Setup

> **Note:** The mobile app is not yet ready for development. Use the PWA for now.

```bash
# Install dependencies
cd mobile-app
npm install

# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

---

## 📄 License

MIT License — see [LICENSE](../LICENSE) file.

---

<div align="center">

**Part of the [TerminalWON](https://github.com/jsodeh/terminalwon) project**

[⭐ Star](https://github.com/jsodeh/terminalwon) · [🐛 Issues](https://github.com/jsodeh/terminalwon/issues) · [💬 Discord](https://discord.gg/UM9CY5A6q)

---

### 💡 Use the PWA Now

While the native app is in development, the PWA provides full functionality:

```
http://YOUR_IP:8080
```

Add to Home Screen for the best experience!

</div>
