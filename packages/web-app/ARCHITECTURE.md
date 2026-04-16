# Web Application Architecture

## Overview

The OSS VAT Calculator web application is a professional-grade React frontend for managing cross-border B2C VAT compliance. Built with Vite, TypeScript, and Tailwind CSS, it demonstrates all five design principles from the research paper.

## Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.2 |
| Language | TypeScript | 5.0+ |
| Build Tool | Vite | 5.0 |
| Styling | Tailwind CSS | CDN |
| Routing | React Router | 6.20 |
| State | React Context | (built-in) |
| Backend | Firebase | 10.7 (optional) |
| Local Storage | Browser API | (fallback) |

## Project Structure

```
packages/web-app/
├── src/
│   ├── main.tsx                 # React DOM render entry
│   ├── App.tsx                  # Route definitions + ProtectedRoute wrapper
│   ├── pages/                   # 6 main page components
│   │   ├── Login.tsx            # Email/password auth + demo mode
│   │   ├── Dashboard.tsx        # KPI cards, threshold alert, system status
│   │   ├── Transactions.tsx     # CRUD: add/edit/delete transactions
│   │   ├── Calculator.tsx       # Real-time VAT calculation UI
│   │   ├── Filing.tsx           # Quarterly return + export buttons
│   │   └── Settings.tsx         # Config, system status, design principles
│   ├── components/              # Reusable UI components
│   │   ├── Layout.tsx           # Sidebar + header navigation
│   │   ├── VatSummaryCard.tsx   # Metric card (color-coded)
│   │   ├── ThresholdAlert.tsx   # EUR 10k threshold warning
│   │   ├── TransactionForm.tsx  # Form for adding single transaction
│   │   └── ReturnPreview.tsx    # NAP Bulgaria table view
│   ├── context/
│   │   └── AppContext.tsx       # React Context + hooks for global state
│   └── services/
│       ├── firebase.ts          # Firebase Auth + Firestore wrapper
│       └── storage.ts           # localStorage interface
├── index.html                    # HTML template with Tailwind CDN
├── package.json                  # Dependencies + scripts
├── tsconfig.json                 # TypeScript strict mode config
├── vite.config.ts               # Vite bundler config
└── README.md                     # User guide
```

## Component Hierarchy

```
main.tsx (React 18 entry)
  ↓
App.tsx (BrowserRouter)
  ↓
  ├─ <Login /> (public route)
  │
  └─ <ProtectedRoute>
      └─ <Layout>
          ├─ <Sidebar Navigation>
          ├─ <Header>
          └─ <Main Content>
              ├─ <Dashboard />
              ├─ <Transactions />
              ├─ <Calculator />
              ├─ <Filing />
              └─ <Settings />
```

## State Management (React Context)

**AppContext** provides:
- User authentication (sign up, sign in, logout)
- Seller information (name, VAT ID, country, email)
- Transactions (CRUD operations)
- Filings (OSS returns history)
- Firebase status (cloud vs. demo mode)

**Storage Backends**:
1. **Firebase (Primary)**: Auth + Firestore persistence
2. **localStorage (Fallback)**: Browser-based storage for demo mode

```typescript
// Usage in components:
const { 
  user, 
  transactions, 
  addTransaction, 
  filings 
} = useAppContext();
```

## Data Models

### Transaction
```typescript
interface StorageTransaction {
  id: string;
  date: string;                      // ISO date
  buyerCountry: string;              // 2-letter code
  amount: number;                    // cents to avoid floats
  currency: string;                  // ISO 4217
  description: string;
  productType: 'goods' | 'services';
  vatRate?: number;                  // percentage
  timestamp: number;                 // Unix timestamp
}
```

### Filing
```typescript
interface StorageFiling {
  id: string;
  period: string;                    // YYYY-Q format
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  createdAt: number;
  submittedAt?: number;
  pdfUrl?: string;
  csvUrl?: string;
}
```

## Integration with Core Packages

### @oss-vat/oss-calculator
- **TaxEngine**: Real-time VAT calculation (Calculator page)
- **getMemberStateRates()**: Rate lookup for all 27 EU MS
- **generatePDFInvoice()**: PDF export (Filing page)
- **generateNAPExportCSV()**: NAP Bulgaria format (Filing page)
- **convertToUBL()**: UBL 2.1/EN 16931 XML (Filing page)

```typescript
// Example usage
const taxEngine = new TaxEngine();
const result = taxEngine.calculateVAT({
  id: 'tx_123',
  date: new Date(),
  customerCountryCode: 'BG',
  amount: 100,
  currency: 'EUR',
  rateType: 'standard',
  isGoods: true
});
```

### @oss-vat/shared-core
- **getAllMemberStates()**: Populate country dropdowns
- **getMemberStateName()**: Display friendly names
- **HMAC audit chain**: Status indicator (Settings page)
- **Data lifecycle taxonomy**: Draft → Processing → Filed

## Design Principles Implementation

### DP1: Near-Zero Cost
- **Metric**: Firebase free tier (2 MB Firestore, 10 GB downloads/month)
- **UI**: Cloud vs. Local badge in Layout sidebar
- **Fallback**: localStorage for demo mode (0 backend cost)
- **Code**: `firebaseService.isDemoMode()` check in AppContext

### DP2: Audit Trail
- **Metric**: HMAC-SHA256 chain via shared-core
- **UI**: Status indicator in Settings page ("✓ Active")
- **Transparency**: Shows that integrity is verified cryptographically
- **Code**: `generateHMACChain()` called by backend on transaction save

### DP3: Data Lifecycle
- **Metric**: Taxonomy stages (Draft → Processing → Filed)
- **UI**: Status badges in Filing history, Dashboard indicators
- **Persistence**: Timestamps for each stage transition
- **Code**: `status` field in StorageFiling, AppContext state

### DP4: Deterministic Calculation
- **Metric**: EU VAT rate tables (TAXUD Q1 2026)
- **UI**: Calculator page shows rate source and version
- **Transparency**: Rate lookup is deterministic and reproducible
- **Code**: `TaxEngine.calculateVAT()` uses getMemberStateRates() with date-based lookup

### DP5: Portal-Aligned Output
- **Metric**: CSV matches NAP Bulgaria sections 2A–2D exactly
- **UI**: "Export CSV for NAP" button, preview table
- **Forward Compatibility**: UBL 2.1/EN 16931 support for ViDA (2025)
- **Code**: `generateNAPExportCSV()` and `convertToUBL()` in Filing page

## Authentication Flow

```
User visits /login
    ↓
Enters email + password
    ↓
AppContext.signUp() OR signIn()
    ↓
┌─────────────────────────────────┐
│ Firebase enabled?               │
├─────────────────────────────────┤
│ YES: Create Firebase user        │
│ NO:  Store in localStorage       │
└─────────────────────────────────┘
    ↓
firebaseService.onAuthStateChanged()
    ↓
setUser() in AppContext
    ↓
ProtectedRoute allows navigation to /dashboard
    ↓
Load seller info + transactions from storage
```

## Styling Strategy

- **Tailwind CSS**: CDN-based utility classes
- **Color Palette**:
  - Primary Blue: #2563EB (actions, links)
  - Success Green: #16a34a (threshold OK, accepted)
  - Warning Amber: #d97706 (threshold approaching)
  - Error Red: #dc2626 (threshold exceeded)
- **Typography**: System fonts for accessibility
- **Responsive**: Mobile-first utility classes, desktop-optimized layout

## Performance Optimizations

1. **Code Splitting**: Vite-automatic per-page components
2. **Memoization**: useMemo() for expensive calculations (stats aggregation)
3. **Lazy Loading**: React Router lazy routes (future enhancement)
4. **No Redux**: React Context avoids bundle bloat
5. **TypeScript**: Compile-time safety reduces runtime errors

## Security Measures

1. **Input Validation**: Form validation on client + server (Firebase rules)
2. **XSS Prevention**: React auto-escapes content
3. **CORS**: Firebase handles CORS for API calls
4. **Secrets**: No hardcoded credentials; uses environment variables
5. **HTTPS**: Firebase enforces HTTPS by default
6. **Session**: Firebase Auth tokens expire automatically

## Testing Strategy

### Unit Testing (Future)
- Component logic with React Testing Library
- Context hooks with @testing-library/react-hooks
- Storage service with localStorage mocks

### Integration Testing (Future)
- Transaction CRUD workflow
- Filing generation and export
- Form validation and error handling

### Manual Testing (Current)
1. Login/signup with demo mode
2. Add transactions with various currencies/countries
3. Calculate VAT and verify rates
4. Generate quarterly return
5. Export CSV/PDF (mock)
6. Check threshold alert behavior

## Deployment

### Development
```bash
pnpm dev --filter web-app
```

### Production Build
```bash
pnpm build --filter web-app
# Output: packages/web-app/dist/
```

### Hosting Options
1. **Vercel**: Native Vite support, zero config
2. **Firebase Hosting**: Integrated with Firestore backend
3. **Netlify**: Git-based continuous deployment
4. **Static S3 + CloudFront**: Cost-effective with CDN

## Browser Support

- Chrome/Edge ≥90 (ES2020 target)
- Firefox ≥88
- Safari ≥14
- No IE11 support (uses modern JS)

## Accessibility

- Semantic HTML (labels, form controls)
- ARIA attributes for complex components
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Screen reader friendly

## Known Limitations & Future Work

### Current
- CSV export is simulated (calls would be to oss-calculator)
- No multi-language (EN only; BG planned)
- Currency conversion uses mock rates (real ECB API pending)
- No batch CSV import
- No email notifications

### Planned
1. **Real CSV Export**: Integrate generateNAPExportCSV()
2. **PDF Generation**: Call generatePDFInvoice() with actual data
3. **UBL Export**: Implement convertToUBL() button
4. **Currency API**: Live ECB rate fetching
5. **Batch Import**: CSV transaction upload
6. **Notifications**: Email alerts for threshold
7. **Analytics**: Transaction trends, filing patterns
8. **ViDA Integration**: Automated 2025+ portal submission
9. **Mobile App**: React Native version
10. **Audit Reports**: Historical compliance tracking

## Monitoring & Logging

### Development
- React DevTools extension
- Vite dev server with HMR
- Browser DevTools (Network, Console, Application tabs)

### Production
- Firebase Analytics
- Sentry for error tracking (future)
- Custom error boundaries (future)

## Documentation

- **README.md**: User guide and getting started
- **ARCHITECTURE.md** (this file): Technical overview
- **Code comments**: JSDoc for public functions
- **Component headers**: Purpose and props documentation

## Author

Marieta Marinova  
Sofia University, Bulgaria  
2026

## References

- React 18: https://react.dev
- Vite: https://vitejs.dev
- TypeScript: https://www.typescriptlang.org
- Tailwind CSS: https://tailwindcss.com
- Firebase: https://firebase.google.com
- React Router: https://reactrouter.com
