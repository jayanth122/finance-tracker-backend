## Finance Tracker Backend

A robust Node.js REST API for managing personal finances. Built with Express.js and Supabase, featuring account management, transaction tracking, category organization, and secure authentication.

### 📋 Overview

The Finance Tracker Backend is a production-ready API server that provides comprehensive financial management capabilities. It handles user authentication, account management, transaction logging, and category organization with built-in security features and connection persistence.

### 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5.2.1
- **Database**: Supabase (PostgreSQL)
- **Client Library**: @supabase/supabase-js v2.103.0
- **Authentication**: JWT-based via Supabase Auth
- **Security**: Helmet, CORS, Rate Limiting, Compression
- **Logging**: Morgan
- **Development**: Nodemon

### ✨ Features

- **Authentication**: Secure JWT-based user authentication with Supabase Auth
- **Account Management**: Create and manage user accounts
- **Transaction Tracking**: Log and manage financial transactions
- **Categories**: Organize transactions with custom categories
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Keep-Alive System**: Automatic Supabase connection persistence
- **CORS Support**: Configurable cross-origin resource sharing
- **Compression**: Response compression for optimized data transfer
- **Security Headers**: Helmet integration for secure HTTP headers
- **Health Checks**: Detailed health status and database connectivity monitoring

### 📂 Project Structure

```
src/
├── app.js                    # Express app configuration & routes
├── config/
│   └── supabase.js          # Supabase client initialization
├── controllers/             # Request handlers
│   ├── authController.js
│   ├── accountController.js
│   ├── categoryController.js
│   └── transactionController.js
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/                  # API route definitions
│   ├── authRoutes.js
│   ├── accountRoutes.js
│   ├── categoryRoutes.js
│   └── transactionRoutes.js
└── services/                # Business logic
    ├── accountService.js
    ├── categoryService.js
    ├── transactionService.js
    └── healthService.js     # Keep-alive & health checks
```

### 🚀 Getting Started

#### Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- Supabase project with API credentials

#### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd finance-tracker-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with required environment variables (see Environment Variables section)

#### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server Configuration
NODE_ENV=development
PORT=5000

# Security
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300

# Keep-Alive (in milliseconds)
KEEP_ALIVE_INTERVAL_MS=300000

# Body Parser
JSON_LIMIT=1mb
```

### 📝 Available Scripts

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Production with environment variable
npm run start:prod

# Run tests
npm test
```

### 🔌 API Endpoints

#### Health & Status
- `GET /health` - Server health check with Supabase connection status
- `GET /api/keep-alive` - Manual keep-alive trigger for Supabase connection

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh authentication token

#### Accounts
- `GET /api/accounts` - List user accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

#### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category details
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

#### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### 🔄 Keep-Alive System

The server includes an automatic keep-alive system that periodically checks the Supabase connection to prevent idle disconnections. This is especially useful for long-running deployments on platforms with connection timeouts.

- **Default interval**: 5 minutes (configurable via `KEEP_ALIVE_INTERVAL_MS`)
- **Automatic**: Starts on server startup and stops on graceful shutdown
- **Monitoring**: Check logs for keep-alive status (non-production mode)

### 🔐 Security Features

- **Helmet**: Sets secure HTTP headers
- **CORS**: Configurable allowed origins
- **Rate Limiting**: Prevents API abuse with configurable limits
- **JWT Authentication**: Secure token-based authentication
- **Compression**: Reduces response payload size

### 📊 Monitoring

The server provides comprehensive health checks:

```bash
# Check server and database health
curl http://localhost:5000/health

# Response example:
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": "2026-05-23T10:30:00.000Z",
  "environment": "development",
  "database": {
    "healthy": true,
    "timestamp": "2026-05-23T10:30:00.000Z",
    "message": "Supabase connection active"
  }
}
```

### 🛑 Graceful Shutdown

The server handles graceful shutdown on SIGINT and SIGTERM signals, ensuring:
- Keep-alive interval is cleared
- Active connections are closed properly
- Database connections are terminated cleanly

### 📄 License

ISC License
