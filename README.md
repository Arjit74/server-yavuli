## Basic Backened Structure Overview
```bash
Server/                          # Backend (Node + Express + Supabase)
│   ├── src/
│   │   ├── config/              # Supabase keys, environment, JWT settings
│   │   ├── routes/              # API route handlers (auth, listings, chat)
│   │   ├── controllers/         # Business logic for each route group
│   │   ├── models/              # Schema abstraction with Supabase/SQL tables
│   │   ├── middleware/          # JWT verification, CORS, error handlers
│   │   ├── utils/               # Helper functions (validators, sendEmail)
│   │   └── app.js               # Express app root file
│   ├── tests/                   # Backend tests (optional)
│   ├── package.json             # Backend dependencies
│   ├── .env.example             # Environment variables example
│   └── server.js                # Entry point for production build
│
├── supabase/                    # Supabase structure
│   ├── migrations/              # SQL schema migrations for database setup
│   ├── functions/               # Edge functions (optional automation logic)
│   ├── storage/                 # Uploaded assets folder map (Supabase storage)
│   └── config.toml              # Supabase local config file
│
├── .gitignore                   # Ignore node_modules, .env, build artifacts
├── README.md                    # Root documentation
├── LICENSE                      # License (Proprietary or MIT)
└── docker-compose.yml            # Optional container setup (if future scaling)
```
