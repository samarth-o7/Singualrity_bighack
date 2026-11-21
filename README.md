# Credit for the Credit-Invisible

**100% Deterministic Cash-Flow Underwriting on India's RBI Account Aggregator Rail**

> **Finance Track — Problem F2** · **Track 01 Synthetic Data Compliant** · **Zero-LLM Underwriting**

---

## Overview

Millions of viable Indian micro-businesses—kirana stores, tailors, and street vendors—remain locked out of formal credit due to the absence of CIBIL scores or physical collateral, driving India's **₹30 Lakh Crore MSME credit gap**.

This platform is an end-to-end, **100% deterministic cash-flow underwriting prototype** designed around India's **RBI Account Aggregator (AA)** framework. Instead of relying on self-reported income, forged PDF bank statements, or opaque AI black boxes, it evaluates credit readiness strictly from **5 tamper-resistant bank and UPI signals** computed in memory with zero raw-statement retention.

---

## Key Features

### 1. Strict Dual-Portal Privacy Architecture
* **Borrower Portal (Single-User Privacy):** Borrowers create a personal account (Name + 10-digit Mobile Number), enter their requested credit amount, and choose a preferred **Periodic Instalment** rhythm (Daily, Weekly, or Monthly). Borrowers can **never** view or access any other applicant's data.
* **Lender Underwriting Desk (Multi-Applicant Queue):** Authenticated NBFC/FIU partners access the live underwriting queue (including newly submitted borrower applications), inspect Policy Reason Codes, run live stress tests, and record decisions (**Approve Terms**, **Offer Starter Tranche**, or **Place on Watchlist**).

### 2. Simulated RBI Account Aggregator (AA) Consent Flow
* Interactive **10-minute, revocable, read-only consent** flow with explicit **OTP verification**.
* **Zero-Retention Privacy:** Raw bank statements are never stored; derived financial ratios are computed in memory and discarded immediately, aligning with India's DPDP Act principles.
* Borrowers can monitor active consent status and revoke access at any time from their **Consent & Privacy** tab.

### 3. 100% Deterministic Underwriting Engine (`src/utils/creditModel.ts`)
Zero LLMs or black-box scoring models. Every Stability Score, credit cap, and knock-out decision is computed in auditable TypeScript with transparent **Policy Reason Codes** from **5 bank/UPI signals** on a single AA rail (no BBPS or Udyam onboarding friction in v1):

| Signal | What It Measures | Why It Matters |
| :--- | :--- | :--- |
| **1. Unique UPI Payers** | Count of distinct counterparties paying the business | Prevents self-transfer gaming and verifies real customer breadth |
| **2. NACH Auto-Debit Bounces (6m)** | Bank-logged electronic auto-debit failures | Objective repayment discipline; **Hard Knock-Out** (`> 2 bounces` forces Watchlist) |
| **3. Inflow-to-Outflow Stability (CV)** | 6-month Coefficient of Variation ($\text{CV} = \frac{\sigma}{\mu}$) | Rewards steady turnover and penalizes erratic or staged last-minute spikes |
| **4. Liquidity Cushion** | Minimum-to-Average Balance Ratio ($\frac{\text{Min Balance}}{\text{Avg Balance}}$) | Measures real cash buffer retained to survive lean weeks |
| **5. Cash Deposit Regularity** | 6-month deposit rhythm consistency index (0–100) | Rewards predictable weekly/bi-weekly cash deposits from cash-first shops |

### 4. Built for Cash-Heavy Vendors & Fair Repayment
* **Dynamic Weighting (`Cash-Heavy · Outflow-Verified`):** Vendors operating mostly in cash are not penalized for low UPI volume; weights automatically shift toward Cash Deposit Regularity, Liquidity Cushion, and NACH discipline.
* **Starter Tranche Trust Ladder:** Modeled on PM SVANidhi—thin-file and cash-heavy borrowers start safely at **₹15,000**, graduating to **₹25,000 → ₹50,000** upon timely repayment.
* **Periodic Instalments (Not Rigid Monthly Commitments):** Daily, weekly, or monthly repayment rhythms strictly capped at **35%–40% of verified monthly net surplus**.

### 5. Interactive Lender Stress-Test Simulator
* Live **Cash-Flow & Safe Repayment Capacity** chart wired to lender risk controls.
* Simulate a **25% lean-month inflow dip** or inject **NACH bounce shocks** to watch Safe Repayment Capacity, Stability Score, and hard knock-out Policy Reason Codes recalculate in real time.

---

## Tech Stack

### Prototype Stack
* **Frontend & UI:** React, TypeScript, Tailwind CSS, Vite (Responsive Desktop + 390px Mobile Frame toggle)
* **Underwriting Engine:** Pure Deterministic TypeScript (`src/utils/creditModel.ts`)
* **Data Simulation:** Track 01 Compliant Synthetic Data Engine (deterministically seeds realistic 6-month bank/UPI profiles per mobile number)
* **Visualizations:** Interactive Cash-Flow & Periodic Instalment Capacity charts

### Production Deployment Path (LSP Model)
Under RBI regulations, direct **Financial Information User (FIU)** access on the Account Aggregator network is restricted to RBI-regulated entities. In production:
* **Regulatory Role:** Operates as a **Lending Service Provider (LSP)** under RBI Digital Lending Guidelines, partnered with an RBI-regulated NBFC or Bank holding the FIU license.
* **Data Rail:** RBI-licensed Account Aggregators (e.g., Finvu, OneMoney, Anumati).
* **Backend & Storage:** Stateless in-memory ratio computation microservice (Node.js / FastAPI) + PostgreSQL storing only consent audit logs, derived ratios, Stability Scores, and Policy Reason Codes.

---

## Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/<samarth-o7>/Singualrity_bighack.git
cd Singualrity_bighack

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the local URL displayed in your terminal (typically `http://localhost:5173`) to explore both the **Borrower Portal** and **Lender Underwriting Desk** in Desktop or 390px Mobile view.

---

## v2 Roadmap (Same AA Rail)
* **Top-Payer Concentration:** Flagging high revenue dependency when a single counterparty accounts for $> 70\%$ of monthly inflows.
* **Low-Balance Stress Days:** Tracking the count of days over 6 months where end-of-day balance drops below a critical liquidity floor.
* **Higher-Ticket Graduation:** Optional Udyam Verification APIs and GSTN-via-AA integration for MSMEs graduating beyond starter tranches.

---

## Synthetic Data Notice
Per hackathon Track 01 compliance guidelines, **no real personal, banking, or financial data is used or stored**. All Account Aggregator OTP flows, bank/UPI transaction profiles, and underwriting queues run strictly on synthetic data generated locally for demonstration purposes.
