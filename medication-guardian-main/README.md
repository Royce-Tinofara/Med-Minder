# Med-Minder

## Project Overview

Med-Minder is a comprehensive medication management system designed to help patients, caregivers, and pharmacists track medications, manage reminders, and coordinate care effectively.

## Problem Statement

Patients and caregivers face difficulties in managing medication schedules and tracking adherence as they use manual methods of tracking which is complicated and error-prone. Patients struggle to remember when to take their medications, leading to missed doses and poor health outcomes. Caregivers and family members find it challenging to monitor their loved ones' medication intake remotely. Healthcare teams lack real-time communication channels to coordinate care effectively.

---

## Core System Objectives

### 1. Medication Management and Tracking
- Add, view, edit medications with dosage, frequency, times, prescriber, pharmacy info
- Track quantity remaining, refills remaining, request refills
- **Status: MET** ✅

### 2. Reminder System
- Schedule medication reminders with status tracking (pending/taken/missed/snoozed)
- **Status: MET** ✅

### 3. Caregiver Coordination
- Assign caregivers to patients with permissions
- **Status: MET** ✅

### 4. Communication
- Chat system between patients, caregivers, and pharmacists
- **Status: MET** ✅

---

## Features

### For Patients
- Add and manage their medications
- Receive automated reminders
- Track medication adherence
- Request refills
- Communicate with caregivers and pharmacists

### For Caregivers
- Monitor patients' medication adherence
- Receive alerts for missed medications
- Chat with patients and pharmacists

### For Pharmacists
- View patient medication lists
- Manage refill requests
- Communicate with patients and caregivers

---

## Technology Stack

This project is built with:

- **Vite** - Build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - Frontend library
- **Supabase** - Backend-as-a-service (PostgreSQL, Authentication, Real-time)
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Recharts** - Charting library

---

## How to Run

### Prerequisites
- Node.js & npm installed

### Installation

```sh
# Step 1: Navigate to the project directory.
cd medication-guardian-main

# Step 2: Install the necessary dependencies.
npm install

# Step 3: Start the development server.
npm run dev
```

### Build for Production

```sh
npm run build
```

---

## Project Structure

```
medication-guardian-main/
├── src/
│   ├── components/        # React components
│   │   ├── AI/           # AI Chat widget
│   │   ├── Chat/         # Chat components
│   │   ├── Layout/       # Layout components
│   │   ├── Medications/  # Medication components
│   │   └── ui/           # shadcn/ui components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── integrations/     # Third-party integrations
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   └── test/              # Test files
├── supabase/
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

---

## License

MIT
