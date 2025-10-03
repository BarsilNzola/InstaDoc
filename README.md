# InstaDoc - Decentralized Telemedicine Platform

## 🩺 Overview

InstaDoc is a revolutionary decentralized telemedicine platform that leverages blockchain technology to create a secure, transparent, and borderless healthcare ecosystem. Our platform connects patients and doctors directly, eliminating intermediaries while ensuring trustless payments and immutable medical records.

## 🚀 Key Features

### 🔐 Secure & Decentralized
- **Blockchain-Powered Escrow**: Secure payment handling with smart contract escrow
- **Patient-Owned Data**: Medical records stored on decentralized storage (Lighthouse)
- **Transparent Transactions**: All payments and interactions recorded on-chain
- **Wallet Authentication**: Secure login via Web3 wallets (MetaMask, WalletConnect)

### 💰 Trustless Payments
- **Automated Escrow System**: Funds held securely until consultation completion
- **Instant Payouts**: Doctors receive U2U tokens automatically after consultations
- **Cancellation Protection**: Fair refund system for cancelled appointments
- **Dispute Resolution**: Admin-mediated dispute handling for edge cases

### 🎥 Video Consultations
- **WebRTC Ready**: Video call interface prepared for real-time communication
- **Secure Communications**: Encrypted peer-to-peer video calls
- **Cross-Platform**: Works on desktop and mobile browsers
- **Demo Mode**: Local camera functionality with WebRTC integration notes

### 📊 Role-Based Dashboard
- **Patient Dashboard**: Book appointments, manage records, join video calls
- **Doctor Dashboard**: Manage appointments, conduct consultations, receive payments
- **Admin Dashboard**: Platform oversight and dispute resolution

## 🏗️ Architecture

### Smart Contracts
InstaDocHub (Main Contract)
├── Patient Registration
├── Doctor Verification
├── Platform Administration
└── Escrow Contract Integration

EscrowPayments (Payment Contract)
├── Appointment Booking
├── Payment Escrow
├── Automatic Payouts
├── Cancellation Handling
└── Dispute Resolution


### Technology Stack
- **Frontend**: React.js + TypeScript + Tailwind CSS
- **Blockchain**: U2U Nebulas Network
- **Smart Contracts**: Solidity
- **Wallet Integration**: Wagmi + Viem
- **Storage**: Lighthouse (Decentralized File Storage)
- **Video**: WebRTC (Ready for Integration)

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- MetaMask or compatible Web3 wallet
- U2U Nebulas Testnet configuration

### Environment Setup
1. Clone the repository:
```bash
git clone https://github.com/your-username/instadoc.git
cd instadoc/frontend

2. Install dependencies:
npm install

3. Set up environment variables:
VITE_HUB_ADDRESS=your_deployed_hub_contract_address
VITE_LIGHTHOUSE_API_KEY=your_lighthouse_storage_api_key

4. Start the development server:
npm run dev

### Smart Contract Deployment
1. Navigate to the contracts directory:
cd contracts

2. Install Hardhat dependencies:
npm install

3. Deploy to U2U Nebulas Testnet:
npx hardhat run scripts/deploy.js --network u2uTestnet

## 🎯 Usage Guide

### For Patients
- Connect Wallet: Link your Web3 wallet to the platform

- Register: Complete one-time patient registration (on-chain)

- Find Doctors: Browse verified healthcare providers

- Book Appointment: Select time and deposit consultation fee

- Join Consultation: Access video call at scheduled time

- Complete Session: Confirm consultation completion to release payment

### For Doctors
- Connect Wallet: Link your professional wallet

- Get Verified: Submit credentials for platform verification

- Manage Appointments: View and confirm incoming consultation requests

- Conduct Consultations: Start video calls with patients

- Receive Payments: Automatic U2U token transfers upon completion

- Upload Records: Securely store consultation notes and prescriptions

## Payment Flow
Patient Books Appointment 
    ↓
Funds Locked in Escrow
    ↓
Doctor Confirms Appointment
    ↓
Video Consultation Occurs
    ↓
Either Party Completes Session
    ↓
Automatic Payment to Doctor
    ↓
Consultation Record Stored

## 🔧 Technical Implementation Notes

### Video Consultation Status
✅ Local Camera Feed: Functional with mute/video controls

✅ UI Framework: Professional medical consultation interface

🔄 WebRTC Integration: Architecture ready, requires signaling server implementation

📝 Integration Notes: Real-time video communication can be added with WebSocket signaling

### Storage Implementation
✅ Lighthouse Integration: Decentralized medical record storage

✅ Encrypted Uploads: Secure file handling with access control

✅ IPFS Backed: Permanent, resilient storage solution

### Blockchain Features
✅ U2U Nebulas Integration: Full testnet deployment

✅ Gas Optimization: Efficient contract operations

✅ Event Logging: Comprehensive on-chain activity tracking

## 🚨 Important Notes

### Payment Processing
Note: Payments to doctors are automatically processed but may take 30-60 seconds due to blockchain confirmation times. This is normal behavior and not a platform issue.

### Video Consultation
Current State: The platform includes a complete video consultation interface with local camera functionality. Full peer-to-peer WebRTC implementation requires additional signaling server setup.

### Storage Security
Medical records are encrypted and stored on Lighthouse decentralized storage, ensuring patient privacy and data ownership while maintaining accessibility.

## 🛠️ Development Roadmap

### Completed Features
- Smart contract development and testing

- Frontend application with responsive design

- Wallet integration and authentication

- Patient and doctor registration

- Appointment booking system

- Escrow payment handling

- Video consultation interface

- Medical record storage

- U2U testnet deployment

### Future Enhancements
- Full WebRTC video implementation

- Mobile application

- AI-powered symptom checker

- Prescription management

- Insurance integration

- Multi-language support

- Advanced analytics dashboard

## 🤝 Contributing
We welcome contributions from the community! Please see our Contributing Guidelines for details.

## Development Setup
- Fork the repository

= Create a feature branch: git checkout -b feature/amazing-feature

- Commit changes: git commit -m 'Add amazing feature'

- Push to branch: git push origin feature/amazing-feature

- Open a Pull Request

## 📄 License
This project is licensed under the MIT License.

