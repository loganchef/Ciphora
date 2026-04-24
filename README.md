<div align="center">
  <img src="./res/logo.png" alt="Ciphora Logo" width="120" height="120">

  <h1>Ciphora</h1>

  <p><strong>Zero-Knowledge Architecture · Cross-Platform Native · Industrial-Grade Encryption</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Version-2.0.0-blue.svg?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/Platform-Windows%20|%20macOS%20|%20Linux%20|%20Android%20|%20iOS-lightgrey.svg?style=flat-square" alt="Platform">
    <img src="https://img.shields.io/badge/Backend-Rust-orange.svg?style=flat-square" alt="Backend">
    <img src="https://img.shields.io/badge/Frontend-React%2018-61dafb.svg?style=flat-square" alt="Frontend">
    <img src="https://img.shields.io/github/stars/loganchef/Ciphora?style=flat-square" alt="Stars">
  </p>

  <p>
    <a href="https://github.com/loganchef/Ciphora/releases">📦 Download</a> ·
    <a href="https://www.bilibili.com/video/BV1B61ZBgEDb/">🎬 Demo</a> ·
    <a href="https://github.com/loganchef/Ciphora/issues">🐛 Issues</a> ·
    <a href="https://github.com/loganchef/Ciphora/wiki">📖 Docs</a> ·
    <a href="./README_CN.md">🇨🇳 中文</a>
  </p>
</div>

---

## 💖 Sponsor

> Ciphora is completely free and open source forever. If it helps you, please consider sponsoring — even a coffee makes a real difference to an indie developer.

<div align="center">

[<img src="https://img.shields.io/badge/❤️_GitHub_Sponsor-ea4aaa?style=for-the-badge&logo=github" />](https://github.com/sponsors/loganchef)

<br>

| WeChat Pay | Alipay |
|:---:|:---:|
| <img src="./readme_res/wechatpay.png" width="200"> | <img src="./readme_res/alipay.png" width="200"> |

</div>

### 🌟 Sponsors

Thanks to everyone who supports Ciphora. You make this project possible.

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/sponsors/loganchef">
        <img src="./readme_res/sponsors/1764307417756.jpg" width="52" height="52" style="border-radius:50%"><br>
        <sub><b>悟吉</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/sponsors/loganchef">
        <img src="https://avatars.githubusercontent.com/u/583231?v=4" width="52" height="52" style="border-radius:50%"><br>
        <sub><b>Your Name Here</b></sub>
      </a>
    </td>
  </tr>
</table>

> After sponsoring, leave a comment in [Issues](https://github.com/loganchef/Ciphora/issues) and I'll add you to the list ✨

---

## Screenshots

<div align="center">
  <table>
    <tr>
      <td><img src="./readme_res/d793f7c0-259d-4901-8a9a-3f428743a0ba.png" width="380" style="border-radius:10px"></td>
      <td><img src="./readme_res/41ae95d8-944c-48d6-b360-b5314f80b422.png" width="380" style="border-radius:10px"></td>
    </tr>
    <tr>
      <td align="center"><i>Secure Login</i></td>
      <td align="center"><i>Vault Manager</i></td>
    </tr>
    <tr>
      <td><img src="./readme_res/e4cab2de-bcb0-4d33-865a-814290f05c9d.png" width="380" style="border-radius:10px"></td>
      <td><img src="./readme_res/38fe97b6-a6b3-4991-bc0a-6fc6fdf8ff9e.png" width="380" style="border-radius:10px"></td>
    </tr>
    <tr>
      <td align="center"><i>Dashboard</i></td>
      <td align="center"><i>Settings</i></td>
    </tr>
  </table>
</div>

---

## About

Ciphora is an open-source password manager built on **Tauri 2.0 + Rust**. No cloud, no sync servers — all data is encrypted and stored locally on your device only.

What makes Ciphora different:

- **True Zero-Knowledge**: Master password never touches disk. Encryption keys are derived in memory and zeroed after use.
- **Cimbar Offline Transfer**: Sync your entire vault across devices via camera — no network required.
- **Multi-type Data**: Not just passwords — MFA keys, Base64 attachments, JSON structs, free-form notes.
- **Ultra Lightweight**: Tauri architecture, installer < 10MB, far less memory than Electron alternatives.

---

## Features

| Feature | Description |
|---------|-------------|
| 🛡️ **Native Security** | Rust backend handles all crypto. Frontend JS cannot touch keys or plaintext. |
| 📱 **All Platforms** | Windows / macOS / Linux / Android / iOS from one codebase. |
| 📡 **Cimbar Transfer** | Fountain-code QR video stream for air-gapped device sync. |
| 🧩 **Multi-type Data** | Password, MFA, Base64, JSON, Notes — unified vault. |
| 🔐 **Built-in MFA** | Native TOTP generation & verification, no third-party app needed. |
| 📂 **Group Management** | Custom groups with icons, batch move & reorder. |
| 📤 **Import / Export** | JSON / CSV, compatible with major password managers. |
| 🌐 **i18n** | Full English & Chinese, auto-detects system language. |
| ⚡ **High Performance** | Binary serialization, millisecond response on 10k+ records. |

---

## Security Architecture

```
Master Password
      │
      ▼
PBKDF2-HMAC-SHA256
(high iterations + device-unique salt)
      │
      ▼
AES-256-GCM Key
      │
      ├──► Encrypt vault data → local storage
      └──► Zeroed from memory after use

Master password never stored in plaintext · Data never leaves your device
```

- **Key Derivation**: PBKDF2-HMAC-SHA256, device-unique salt, rainbow-table resistant
- **Symmetric Encryption**: AES-256-GCM — confidentiality + integrity (tamper-proof)
- **Zero-Knowledge**: Hash-based master password verification, original password never stored or transmitted
- **Memory Isolation**: Tauri sandbox — frontend JS cannot access filesystem or crypto handles

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Core / Crypto | Rust 1.75+, Tauri 2.0 |
| Frontend | React 18, Vite 7 |
| Styling | Tailwind CSS 4, Heroicons, Lucide |
| i18n | i18next (UI + backend dual-stack) |
| MFA | TOTP (speakeasy / totp-lite) |
| Mobile | Kotlin (Android), Swift (iOS) via Tauri Bridge |
| Crypto libs | aes-gcm, argon2, sha2, rand (Rust) |

---

## Quick Start

### Download

Get the installer for your platform from [Releases](https://github.com/loganchef/Ciphora/releases):

| Platform | File |
|----------|------|
| Windows x64 | `Ciphora_*_x64-setup.exe` |
| Windows x86 | `Ciphora_*_x86-setup.exe` |
| macOS Apple Silicon | `Ciphora_*_aarch64.dmg` |
| macOS Intel | `Ciphora_*_x64.dmg` |
| Linux | `Ciphora_*_amd64.AppImage` |
| Android | `Ciphora_*.apk` |

### Build from Source

**Requirements**: Node.js 18+, Rust 1.75+, [Tauri prerequisites](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/loganchef/Ciphora.git
cd Ciphora

npm install

# Desktop dev
npm run tauri:dev

# Build desktop
npm run tauri:build

# Build Android
npm run tauri:android:init
npm run tauri:android:build

# Build iOS (macOS + Xcode required)
npm run tauri:ios:init
npm run tauri:ios:build
```

---

## License

[MIT License](./LICENSE) · Copyright © 2025 Ciphora

<div align="center">
  <br>
  <b>Made with ❤️ by <a href="https://github.com/loganchef">loganchef</a></b>
  <br><br>
  <i>If Ciphora helps you, a ⭐ is the best free support you can give.</i>
</div>
