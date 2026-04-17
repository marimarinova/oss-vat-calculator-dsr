# OSS VAT Calculator — Web Application

User-facing frontend for micro-enterprise cross-border VAT compliance. Part of the Design Science Research artefact.

## Architecture

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS (CDN)
- **Routing**: React Router v6
- **State Management**: React Context (useContext + useState)
- **Backend**: Firebase Auth + Firestore (with localStorage fallback)
- **Dependencies**:
  - `@oss-vat/oss-calculator` — VAT rate tables, tax engine, output generators
  - `@oss-vat/shared-core` — HMAC audit chain, data lifecycle taxonomy

## Features

### 1. Dashboard

- Summary cards: transaction count, net amount, VAT liability, threshold status
- Quick stats by Member State (top 5)
- Threshold alert (EUR 10,000 OSS registration limit)
- System status indicators (Firebase, HMAC chain, data lifecycle, VAT engine version)
- Design Principles reference

### 2. Transactions

- Add single transactions with buyer country, amount, currency, description
- Edit/delete functionality
- Filter by country and search by description
- Transaction list with VAT preview
- Aggregate statistics (net total, VAT liability)

### 3. VAT Calculator

- Real-time calculation with EU VAT rate tables
- Currency conversion support (EUR, USD, GBP, BGN)
- Standard/reduced/super-reduced rate selection
- Rate transparency with TAXUD source attribution
- Multi-currency member state rate lookup

### 4. Filing / OSS Return

- Quarterly return view (Q1–Q4, 2 years)
- Transaction aggregation by Member State
- NAP Bulgaria format preview (sections 2A–2D)
- Export buttons:
  - **PDF**: Article 226 TFEU compliant invoice format
  - **CSV**: NAP Bulgaria portal-compatible format
  - **UBL 2.1/EN 16931**: XML for ViDA (2025) forward compatibility
- Filing history with status tracking (draft, submitted, accepted, rejected)

### 5. Settings

- Seller information (name, VAT ID, country, email)
- System status monitoring:
  - Data storage (Cloud vs. Local)
  - HMAC audit chain status
  - Data lifecycle taxonomy
  - VAT engine version
  - Output format support
- Design Principles explanation
- Development information

## Design Principles (DSR)

### DP1: Near-Zero Cost

- Firebase free tier: 2 MB Firestore, 10 GB downloads/month
- localStorage fallback for demo mode (no server cost)
- Responsive UI for desktop-first accounting users

### DP2: Audit Trail

- HMAC-SHA256 chain via `@oss-vat/shared-core`
- Cryptographic proof for transaction integrity
- Displayed in Settings for transparency

### DP3: Data Lifecycle

- Taxonomy: Draft → Processing → Filed
- Timestamp tracking for each stage
- Status indicator in Dashboard and Filing views

### DP4: Deterministic Calculation

- EU VAT rate tables (Q1 2026, TAXUD source)
- Rate version tracking in UI
- Reproducible results across sessions
- Transparent rate source attribution

### DP5: Portal-Aligned Output

- CSV exports match NAP Bulgaria sections 2A–2D exactly
- PDF uses Article 226 TFEU format
- UBL 2.1/EN 16931 support for ViDA (2025) compatibility
- Forward-compatible schema

## Getting Started

### Prerequisites

- Node.js ≥20.0.0
- pnpm ≥9.0.0

### Installation

```bash
# Install dependencies
cd /path/to/oss-vat-calculator-dsr
pnpm install

# (Optional) Configure Firebase
# Create .env.local in packages/web-app:
# VITE_FIREBASE_CONFIG='{"projectId":"your-project","apiKey":"...","authDomain":"...","databaseURL":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
```

### Development

```bash
# Start dev server (Vite)
pnpm dev --filter web-app

# Open http://localhost:5173
```

### Production Build

```bash
# Build with TypeScript checking
pnpm build --filter web-app

# Output: packages/web-app/dist/
```

## Demo Mode

If Firebase is not configured, the app runs in **demo mode** using localStorage:

- User authentication is simulated
- All data persists in browser storage
- Perfect for reviewers and testing without backend setup

## File Structure

```
packages/web-app/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router setup
│   ├── pages/
│   │   ├── Login.tsx         # Auth page
│   │   ├── Dashboard.tsx     # Summary and KPIs
│   │   ├── Transactions.tsx  # CRUD operations
│   │   ├── Calculator.tsx    # Real-time VAT calc
│   │   ├── Filing.tsx        # OSS return & export
│   │   └── Settings.tsx      # Configuration
│   ├── components/
│   │   ├── Layout.tsx        # Sidebar nav + header
│   │   ├── VatSummaryCard.tsx
│   │   ├── ThresholdAlert.tsx
│   │   ├── TransactionForm.tsx
│   │   └── ReturnPreview.tsx
│   ├── context/
│   │   └── AppContext.tsx    # Global state (React Context)
│   └── services/
│       ├── firebase.ts       # Firebase integration
│       └── storage.ts        # localStorage service
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Styling

- **Tailwind CSS**: Utility-first via CDN
- **Color Palette**:
  - Primary: Blue (#2563EB)
  - Success: Green (#16a34a)
  - Warning: Amber (#d97706)
  - Error: Red (#dc2626)
- **Typography**: System fonts, responsive design
- **Responsive**: Mobile-friendly but desktop-first for accountants

## Integration Points

### With @oss-vat/oss-calculator

- `TaxEngine.calculateVAT()` → Calculator page
- `getMemberStateRates()` → TransactionForm, Calculator
- `generatePDFInvoice()` → Filing page (button)
- `generateNAPExportCSV()` → Filing page (button)
- `convertToUBL()` → Filing page (export)

### With @oss-vat/shared-core

- `getAllMemberStates()` → Country dropdowns
- `getMemberStateName()` → Display labels
- HMAC audit chain → Settings status badge

## Testing Notes for Reviewers

1. **No Firebase Required**: App works offline with localStorage
2. **Sample Data**: Add transactions in Transactions page to populate Dashboard
3. **Currency Support**: USD/GBP transactions convert via mock ECB rates
4. **CSV Export**: Matches NAP Bulgaria format (sections 2A–2D)
5. **Responsive**: Desktop-optimized, mobile view available

## Security Considerations

- Firebase Auth: Email/password (use Firebase's security rules in production)
- localStorage: Client-side only, no sensitive data sent to backend
- HMAC chain: Provides integrity verification via shared-core
- TypeScript strict mode: Type safety throughout

## Future Enhancements

1. **Multi-language**: EN + BG interface toggle
2. **Real ECB API**: Live currency rate fetching
3. **Batch CSV Import**: Upload transaction files
4. **Email Notifications**: Threshold alerts
5. **PDF Signing**: Digital signature support
6. **ViDA Integration**: Automated portal submission (2025+)
7. **Analytics**: Transaction trends, filing patterns

## Author

Marieta Marinova  
Design Science Research — OSS VAT Calculator  
Sofia University, Bulgaria

## License

MIT
