# Sphynx — Blockchain-Based Zero-Knowledge Password Manager

Sphynx is a next-generation decentralized and password-less credential locker. It replaces traditional single-point-of-failure credentials (emails, passwords, API secrets) with Web3 digital signatures via the standard **EIP-4361 Sign-In with Ethereum (SIWE)** protocol, backed by short-lived **JSON Web Token (JWT)** session states.

This repository hosts Phase 1, establishing a robust, production-grade security architecture separating a Next.js frontend app and an Express.js authentication API.

---

## Technical Architecture

```
                                  [ Web3 MetaMask Wallet ]
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      │  (1) eth_requestAccounts                                                    │  (5) Sign Message
      ▼                                                                             ▼
[ Next.js Frontend ] ──(2) POST /auth/nonce──► [ Express.js Backend ] ──(6) POST /auth/verify ──► [ Generate JWT ]
      ▲              ◄──(3) Expiring Nonce───          │              ◄──(7) Return Auth JWT───          │
      │                                                │                                                 │
      └───────────────────(8) Save Session & Decrypt ──┴────────────────(9) GET /auth/profile ───────────┘
```

### Security Handshake Pipeline
1. **Wallet Connection**: The frontend prompts MetaMask to connect the user's active account via `BrowserProvider` and retrieves the address.
2. **Nonce Request**: Frontend posts the wallet address to the Express API (`POST /api/auth/nonce`).
3. **Nonce Session Generation**: Backend generates a cryptographically random, single-use nonce, and stores it in-memory with a strict **90-second expiration** timestamp (auto-garbage collected).
4. **EIP-4361 (SIWE) Compilation**: The client formats a valid EIP-4361 "Sign-In with Ethereum" message containing the backend nonce, host domain, chain ID, URI, and timestamp.
5. **Signature Request**: MetaMask prompts the user to sign the exact EIP-4361 text block using `personal_sign`.
6. **Signature Verification**: The frontend dispatches the original text, signature, and address back to the backend (`POST /api/auth/verify`).
7. **Cryptographic Validation & Invalidation**:
   - Backend retrieves the active nonce session for the wallet address and asserts it is still within its 90-second validity window.
   - It validates that the EIP-4361 message matches the expected domain, address, and nonce.
   - It recovers the signature's signer using `ethers.verifyMessage` and checks that it matches the requester.
   - **Crucial Replay Guard**: The active nonce is immediately and **atomically deleted** from memory, preventing any replay or double-submitting.
8. **JWT Session Generation**: Backend signs a short-lived (1 hour) JSON Web Token (JWT) using the secure `JWT_SECRET` and returns it to the client.
9. **Authorized Dashboard Workspace**: The client stores the JWT in Zustand/localStorage and redirects to `/dashboard`. The dashboard makes authorized requests (via `Authorization: Bearer <token>`) to load the protected user profile (`GET /api/auth/profile`). If any request fails with a 401/403, the client-side fetch wrapper immediately purges localStorage.

---

## Directory Structure

```
├── backend/                  # Node.js + Express.js API
│   ├── src/
│   │   ├── controllers/      # Nonce and SIWE verification endpoints
│   │   ├── middleware/       # Bearer JWT route guardian
│   │   ├── routes/           # Router binding
│   │   ├── utils/            # Cryptography (Randomizer & SIWE parser)
│   │   └── server.ts         # Express server, CORS & Helmet setup
│   ├── tsconfig.json         # Strict TypeScript settings
│   └── package.json          # Node dependencies (express, ethers, jsonwebtoken, helmet)
│
└── frontend/                 # Next.js App Router Web Client
    ├── app/                  # App Router Pages (landing, login, dashboard)
    ├── components/           # UI elements and Wallet Connector button
    ├── lib/                  # fetch interceptor API client & SIWE formatter
    ├── store/                # Zustand SSR-safe state store
    └── types/                # TypeScript interfaces
```

---

## Quick Start Development Guide

Follow these steps to spin up both applications locally side-by-side.

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [MetaMask Extension](https://metamask.io/) installed in your browser

---

### Step 1: Spin Up the Express Backend

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy the template environmental settings to `.env`:
   ```bash
   copy .env.example .env
   ```
   *(On macOS/Linux use: `cp .env.example .env`)*
3. View or adjust `.env` parameters if needed:
   * `PORT`: `5000` (development default)
   * `JWT_SECRET`: Standard secure key.
   * `ALLOWED_ORIGIN`: `http://localhost:3000` (permits local Next.js client request integration)
4. Start the Express API in development hot-reload mode:
   ```bash
   npm run dev
   ```
   The backend API will fire up at `http://localhost:5000`.

---

### Step 2: Spin Up the Next.js Frontend

1. Open a new terminal session and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Start the local Next.js development server:
   ```bash
   npm run dev
   ```
   The web client will boot at `http://localhost:3000`.
3. Open your browser and navigate to `http://localhost:3000`. Connect your MetaMask wallet, approve the signature request, and explore the Obsidian Security Dashboard!
