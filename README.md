## Basic Backened Structure Overview
```bash
Server/                          # Root directory
├── src/                         # Source code
│   ├── config/                  # Configuration files
│   │   - Supabase credentials
│   │   - Environment variables
│   │   - JWT (JSON Web Token) settings
│   │
│   ├── routes/                  # API endpoints
│   │   - auth.routes.js        # Authentication routes
│   │   - listings.routes.js    # Property listing endpoints
│   │   - chat.routes.js        # Real-time chat functionality
│   │
│   ├── controllers/            # Business logic
│   │   - auth.controller.js    # Handle authentication logic
│   │   - listing.controller.js # Handle property operations
│   │   - chat.controller.js    # Manage chat functionality
│   │
│   ├── models/                 # Data layer
│   │   - User.js              # User schema and methods
│   │   - Listing.js           # Property listing schema
│   │   - Message.js           # Chat message schema
│   │
│   ├── middleware/             # Request processors
│   │   - auth.js              # JWT verification
│   │   - cors.js              # CORS configuration
│   │   - errorHandler.js      # Error handling
│   │
│   └── utils/                 # Helper functions
│       - validators.js        # Input validation
│       - sendEmail.js         # Email utilities
│       - logger.js            # Logging utilities
│
├── tests/                   # Backend tests (optional)
├── package.json             # Backend dependencies
├── .env.example             # Environment variables example
└── server.js                # Entry point for production build
```
