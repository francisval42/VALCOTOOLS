# Valco Document Studio

## Overview

Valco Document Studio is a browser-based document management and invoice generation application for Valco Group. The application provides multiple tools for creating professional PDF documents including tax invoices, private sale invoices, dealership invoice requests, and loan calculations. All document generation and data persistence happens client-side using localStorage and pdf-lib for PDF creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled with Vite
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Font**: Poppins (loaded via Google Fonts)
- **Brand Colors**: Navy (#1f2a44) and Orange (#fe6900)

### Application Structure
- **Layout**: Fixed sidebar navigation (280px) with main content area
- **Tabs/Tools**:
  1. Loan Calculator - Financial calculations with PDF quote generation
  2. Valco Invoice Generator - Tax invoices using Valco letterhead PDF
  3. Private Sale Invoice - Vehicle sale invoices with DoxAI report parsing
  4. Dealership Invoice Request - Request documents for dealerships
  5. Settings (placeholder)

### Data Layer
- **Persistence**: Browser localStorage for all data (invoices, suppliers, settings)
- **State Management**: React useState/useEffect hooks, no external state library
- **Data Validation**: Zod schemas for type validation

### PDF Generation
- **Library**: pdf-lib for client-side PDF creation
- **Letterhead**: Pre-existing Valco letterhead PDF (`public/valco-letterhead.pdf`) with logo and footer
- **Fonts**: Custom font embedding via @pdf-lib/fontkit

### Backend Architecture
- **Server**: Express.js with TypeScript (minimal, primarily serves static files)
- **Database**: PostgreSQL with Drizzle ORM (schema defined but not heavily utilized - app is primarily client-side)
- **Session**: connect-pg-simple for session storage capability
- **Build**: esbuild for server bundling, Vite for client

### Project Structure
```
client/src/
├── tabs/           # Main tool components (LoanCalculatorTab, ValcoInvoiceTab, etc.)
├── components/     # Reusable UI components
├── components/ui/  # shadcn/ui components
├── lib/            # Utilities (money, dates, types)
├── lib/loanCalc/   # Loan calculator logic and PDF
├── lib/privateSale/# Private sale logic, parsing, PDF
├── lib/dealerRequest/ # Dealership request logic and PDF
├── lib/storage/    # localStorage helpers
├── lib/pdf/        # PDF generation utilities
├── layout/         # Layout components (SidebarLayout)
└── brand/          # Brand constants (colors)

server/
├── index.ts        # Express server entry
├── routes.ts       # API routes
├── storage.ts      # Data storage interface
└── static.ts       # Static file serving

shared/
└── schema.ts       # Drizzle database schema
```

## External Dependencies

### Third-Party Services
- **Google Fonts**: Poppins font family loaded via CDN

### Key Libraries
- **pdf-lib**: Client-side PDF generation and manipulation
- **@pdf-lib/fontkit**: Custom font embedding for PDFs
- **date-fns**: Date formatting and manipulation
- **@tanstack/react-query**: Data fetching (available but minimally used)
- **Drizzle ORM**: Database ORM with PostgreSQL dialect
- **Zod**: Schema validation

### Database
- **PostgreSQL**: Configured via DATABASE_URL environment variable
- **Drizzle Kit**: Database migration tooling (`db:push` command)

### Build Tools
- **Vite**: Frontend dev server and bundler
- **esbuild**: Server-side bundling for production
- **TypeScript**: Full TypeScript support across client and server