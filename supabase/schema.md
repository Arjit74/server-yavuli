# 📘 Database Schema Documentation

This document describes the database schema for the Marketplace project.

---

## 1. Users Table

**Purpose:** Store user profile and authentication data

| Field             | Data Type     | Constraints              | Description                        |
|-------------------|--------------|--------------------------|------------------------------------|
| id                | UUID         | PRIMARY KEY              | Unique user identifier             |
| email             | VARCHAR(255) | UNIQUE, NOT NULL         | User login email                   |
| password_hash     | VARCHAR(255) | NOT NULL                 | Hashed password (Supabase Auth)    |
| full_name         | VARCHAR(255) |                          | User's full name                   |
| phone             | VARCHAR(20)  |                          | Contact number                     |
| profile_image_url | TEXT         |                          | Profile picture link               |
| bio               | TEXT         |                          | User description                   |
| location          | VARCHAR(255) |                          | City/area                          |
| rating            | DECIMAL(3,2) | DEFAULT 0.00             | Average rating (0–5)               |
| total_reviews     | INTEGER      | DEFAULT 0                | Number of reviews received         |
| is_verified       | BOOLEAN      | DEFAULT false            | Email/phone verified               |
| created_at        | TIMESTAMP    | DEFAULT NOW()            | Account creation time              |
| updated_at        | TIMESTAMP    | DEFAULT NOW()            | Last profile update                |

**Indexes:**
- `email` (unique)
- `created_at` (for sorting new users)

---

## 2. Listings Table

**Purpose:** Store marketplace items/services for sale

| Field     | Data Type     | Constraints              | Description                  |
|-----------|--------------|--------------------------|------------------------------|
| id        | UUID         | PRIMARY KEY              | Unique listing identifier    |
| user_id   | UUID         | FK → users(id)           | Seller/owner of listing      |
| title     | VARCHAR(255) | NOT NULL                 | Item name                    |
| description | TEXT       |                          | Detailed description         |
| category  | VARCHAR(100) |                          | e.g., Electronics, Furniture |
| price     | DECIMAL(10,2)| NOT NULL                 | Item price                   |
| condition | VARCHAR(50)  |                          | new, like-new, good, fair    |
| status    | VARCHAR(50)  | DEFAULT 'active'         | active, sold, archived       |
| location  | VARCHAR(255) |                          | Pickup/delivery location     |
| images    | TEXT[]       |                          | Array of image URLs          |
| views     | INTEGER      | DEFAULT 0                | View count                   |
| created_at| TIMESTAMP    | DEFAULT NOW()            | Listing creation time        |
| updated_at| TIMESTAMP    | DEFAULT NOW()            | Last edit time               |

**Relationships:**
- `user_id → users.id` (many-to-one)

**Indexes:**
- `user_id`
- `category`
- `status`
- `created_at`

---

## 3. Messages Table

**Purpose:** Store chat messages between buyers and sellers

| Field       | Data Type  | Constraints              | Description                  |
|-------------|-----------|--------------------------|------------------------------|
| id          | UUID      | PRIMARY KEY              | Unique message identifier    |
| sender_id   | UUID      | FK → users(id)           | Who sent the message         |
| receiver_id | UUID      | FK → users(id)           | Who receives the message     |
| listing_id  | UUID      | FK → listings(id)        | Related listing (nullable)   |
| content     | TEXT      | NOT NULL                 | Message text                 |
| is_read     | BOOLEAN   | DEFAULT false            | Read status                  |
| created_at  | TIMESTAMP | DEFAULT NOW()            | Message send time            |

**Indexes:**
- `(sender_id, receiver_id)` (fetch conversation)
- `listing_id`
- `is_read`

---

## 4. Transactions Table

**Purpose:** Record completed/pending sales

| Field           | Data Type     | Constraints              | Description                  |
|-----------------|--------------|--------------------------|------------------------------|
| id              | UUID         | PRIMARY KEY              | Unique transaction identifier|
| listing_id      | UUID         | FK → listings(id)        | Item purchased               |
| buyer_id        | UUID         | FK → users(id)           | Who bought the item          |
| seller_id       | UUID         | FK → users(id)           | Who sold the item            |
| amount          | DECIMAL(10,2)| NOT NULL                 | Final transaction amount     |
| status          | VARCHAR(50)  | DEFAULT 'pending'        | pending, completed, etc.     |
| payment_method  | VARCHAR(100) |                          | cash, upi, card, wallet      |
| transaction_date| TIMESTAMP    | DEFAULT NOW()            | When payment occurred        |
| created_at      | TIMESTAMP    | DEFAULT NOW()            | Record creation time         |

**Indexes:**
- `buyer_id`
- `seller_id`
- `status`

---

## 5. Reports Table

**Purpose:** Store user reports for moderation

| Field           | Data Type     | Constraints              | Description                  |
|-----------------|--------------|--------------------------|------------------------------|
| id              | UUID         | PRIMARY KEY              | Unique report ID             |
| reporter_id     | UUID         | FK → users(id)           | Who filed the report         |
| reported_user_id| UUID         | FK → users(id)           | User being reported (nullable)|
| listing_id      | UUID         | FK → listings(id)        | Listing being reported (nullable)|
| reason          | VARCHAR(255) | NOT NULL                 | Reason (spam, scam, etc.)    |
| description     | TEXT         |                          | Extra details                |
| status          | VARCHAR(50)  | DEFAULT 'pending'        | pending, reviewed, resolved  |
| created_at      | TIMESTAMP    | DEFAULT NOW()            | Report submission time       |

**Indexes:**
- `status`
- `reported_user_id`

**Constraint:**
- At least one of `reported_user_id` or `listing_id` must be non-null.

---

## 🔗 Entity Relationship Diagram (ERD)
+---------+          +-----------+          +---------------+
|  Users  | 1     N |  Listings | 1     N |   Messages     |
+---------+          +-----------+          +---------------+
| id (PK) |<--------- user_id    |          | sender_id (FK)|
| email   |                       --------->| receiver_id   |
| ...     |                                | listing_id(FK)|
+---------+                                +---------------+
     | 1
     | N
     v
+---------------+
| Transactions  |
+---------------+
| buyer_id (FK) |
| seller_id(FK) |
| listing_id(FK)|
+---------------+

+---------+
| Reports |
+---------+
| reporter_id (FK)     |
| reported_user_id(FK) |
| listing_id (FK)      |
+----------------------+

- **Users → Listings**: One user can create many listings (1:N)  
- **Users ↔ Messages**: Users can send/receive many messages (N:M via sender/receiver)  
- **Listings → Messages**: One listing can have many related messages (1:N)  
- **Users + Listings → Transactions**: Each transaction links one buyer, one seller, one listing (N:1:1)  
- **Users → Reports**: Users can file multiple reports (1:N)  

---

## 📌 Additional Considerations

- **Future Tables (Phase 2):**  
  - `reviews` (user reviews/ratings)  
  - `favorites` (saved/bookmarked listings)  
  - `categories` (separate category management)  
  - `notifications` (push/email notification log)  

- **Security Notes:**  
  - All tables will have Row Level Security (RLS) enabled  
  - Users can only modify their own data  
  - Admins need special role for reports table  
  - Supabase Auth handles authentication  

- **Storage:**  
  - Product images stored in Supabase Storage buckets  
  - Image URLs stored as arrays in `listings.images`  

---