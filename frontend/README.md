# ScholarFlex Frontend

React + Vite frontend application for ScholarFlex - A comprehensive student assessment and management system.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ScholarFlex/frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:

- React 19 - UI library
- Vite - Build tool and dev server
- React Router DOM - Routing
- Tailwind CSS - Styling framework
- React Hook Form - Form management
- Zod - Schema validation
- And other dependencies

### Step 3: Environment Configuration

Create a `.env` file in the frontend directory:

```bash
# On Windows (PowerShell)
copy .env.example .env

# On Linux/Mac
cp .env.example .env
```

Update the `.env` file with your backend API URL:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:5000/api
```

**Note:** If you don't have a `.env.example` file, create a `.env` file with the above content.

### Step 4: Run the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or the next available port).

### Step 5: Build for Production

```bash
npm run build
```

This will create an optimized production build in the `dist` directory.

### Step 6: Preview Production Build

```bash
npm run preview
```

This will serve the production build locally for testing.

## Available Scripts

- `npm run dev` - Start development server with hot module replacement (HMR)
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components
│   │   ├── common/      # Common components (errors, etc.)
│   │   ├── dashboard/   # Dashboard-specific components
│   │   ├── interns/     # Intern management components
│   │   ├── layout/      # Layout components (navbar, etc.)
│   │   ├── login/       # Login/OTP components
│   │   └── question-papers/  # Question paper components
│   ├── config/          # Configuration files (routes, paths)
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   │   ├── admin/       # Admin pages
│   │   ├── dashboard/   # Dashboard page
│   │   ├── interns/     # Intern management pages
│   │   ├── login/       # Login page
│   │   ├── question-papers/  # Question paper pages
│   │   ├── student/     # Student test pages
│   │   └── test-attempts/    # Test attempts page
│   ├── services/        # API service layer
│   ├── utils/           # Utility functions and data
│   ├── App.jsx          # Main App component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies and scripts
```

## Features

- ✅ **OTP-based Authentication** - Secure login with email OTP
- ✅ **Role-based Access Control** - Different views for Super Admin, Admin, and Students
- ✅ **Dashboard** - Dynamic statistics and KPI cards
- ✅ **Intern Management** - Add, view, edit, and delete interns via spreadsheet upload
- ✅ **Question Paper Management** - Create and manage question papers with sections
- ✅ **Test Delivery** - Adaptive testing system for students
- ✅ **Admin Management** - Super Admin can create and manage other admins
- ✅ **Responsive Design** - Mobile-friendly UI with Tailwind CSS
- ✅ **Modern UI/UX** - Clean and intuitive interface

## Technology Stack

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form state management
- **Zod** - Schema validation

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. You can also specify a port:

```bash
npm run dev -- --port 3000
```

### Build Errors

If you encounter build errors:

1. Clear node_modules and reinstall:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

### API Connection Issues

If the frontend can't connect to the backend:

1. Verify the backend is running on the correct port
2. Check `VITE_API_BASE_URL` in your `.env` file
3. Ensure CORS is properly configured in the backend

### Styling Issues

If Tailwind CSS styles aren't applying:

1. Ensure Tailwind is properly configured in `vite.config.js`
2. Check that classes are being used correctly
3. Restart the dev server after configuration changes

## Development Notes

- The application uses **React 19** with the latest features
- **Vite** provides fast HMR (Hot Module Replacement) for development
- **Tailwind CSS** is used for all styling - no separate CSS files needed
- API calls are centralized in `src/services/api.js`
- Authentication state is managed via `src/utils/auth.js`
- Routes are defined in `src/config/routes.jsx`

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
