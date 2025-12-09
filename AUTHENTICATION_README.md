# Authentication System Documentation

## Overview

This project now includes a complete JWT-based authentication system with the following features:

- User login/logout
- JWT token-based authentication
- Protected routes
- Role-based access control
- Password hashing with bcrypt
- Persistent sessions using localStorage

## Architecture

### Backend (FastAPI)

#### Files Created/Modified:

1. **`backend/config/config.py`**

   - Added JWT configuration (SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES)
   - Added CORS origins configuration

2. **`backend/schemas/auth_schemas.py`**

   - LoginRequest, LoginResponse schemas
   - UserResponse, TokenData schemas
   - VerifyTokenResponse schema

3. **`backend/services/auth_service.py`**

   - Password hashing and verification (bcrypt)
   - JWT token creation and validation
   - User authentication logic
   - User retrieval by ID

4. **`backend/routes/auth_routes.py`**

   - POST `/api/v1/auth/login` - User login
   - POST `/api/v1/auth/logout` - User logout
   - GET `/api/v1/auth/verify` - Verify JWT token
   - GET `/api/v1/auth/me` - Get current user info

5. **`backend/utils/dependencies.py`**

   - `get_current_user()` - Dependency to extract user from JWT
   - `get_current_active_user()` - Ensure user is active
   - `require_role()` - Role-based access control decorator
   - `require_admin` - Admin-only access

6. **`backend/main.py`**
   - Registered auth router
   - Updated CORS configuration

### Frontend (React TypeScript)

#### Files Created:

1. **`frontend/src/services/authService.ts`**

   - API calls for login, logout, verify token
   - Token and user data management (localStorage)
   - Authorization header generation

2. **`frontend/src/contexts/AuthContext.tsx`**

   - Global authentication state management
   - Login/logout functions
   - Auto-verify token on app load
   - User state management

3. **`frontend/src/components/Login/`**

   - Login form component with validation
   - Username and password inputs
   - Loading states and error handling
   - Styled with gradient design

4. **`frontend/src/components/ProtectedRoute/`**

   - Route protection wrapper
   - Redirects to login if not authenticated
   - Optional role-based access control

5. **`frontend/src/App.tsx`**

   - Integrated React Router
   - AuthProvider wrapper
   - Route definitions (public and protected)
   - ToastContainer for notifications

6. **`frontend/src/components/Navbar/Navbar.tsx`**

   - Added user dropdown menu
   - Logout functionality
   - Display user name and role

7. **`frontend/src/components/Layout/Layout.tsx`**
   - Integrated with React Router navigation
   - Simplified props (removed manual navigation handlers)

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies (already done)
pip install python-jose[cryptography] passlib[bcrypt]

# Create test users
python create_users.py --all
```

This will create:

- **admin** / admin123 (ADMIN role)
- **manager** / manager123 (BRANCH_MANAGER role)
- **clerk** / clerk123 (CLERK role)

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install react-router-dom react-icons

# Start development server
npm run dev
```

### 3. Environment Variables

Ensure your `backend/.env` file has:

```env
# Security - JWT Configuration
SECRET_KEY=your-super-secret-key-change-in-production-12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
```

**⚠️ IMPORTANT:** Change the SECRET_KEY in production!

## Usage

### User Login

1. Navigate to `http://localhost:5173/login`
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Sign In"
4. You'll be redirected to `/customer-list`

### Protected Routes

All routes except `/login` are protected and require authentication:

- `/customer-list`
- `/loan-pastdue-reports`

If not authenticated, users are automatically redirected to `/login`.

### Logout

Click on the user avatar in the navbar → Click "Logout"

## API Endpoints

### Authentication Endpoints

#### POST `/api/v1/auth/login`

Login with username and password.

**Request:**

```json
{
  "user_name": "admin",
  "password": "admin123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "user_name": "admin",
    "name": "System Administrator",
    "user_role": "ADMIN",
    "status": 1
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### POST `/api/v1/auth/logout`

Logout current user.

**Headers:**

```
Authorization: Bearer <token>
```

#### GET `/api/v1/auth/verify`

Verify JWT token validity.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "valid": true,
  "user": { ... },
  "message": "Token is valid"
}
```

#### GET `/api/v1/auth/me`

Get current authenticated user information.

**Headers:**

```
Authorization: Bearer <token>
```

## Role-Based Access Control

### Using in Routes

```python
from fastapi import APIRouter, Depends
from utils.dependencies import require_admin, require_role

router = APIRouter()

# Admin only
@router.get("/admin-only")
async def admin_only_route(current_user = Depends(require_admin)):
    return {"message": "Admin access granted"}

# Multiple roles
@router.get("/managers")
async def managers_route(current_user = Depends(require_role("ADMIN", "BRANCH_MANAGER"))):
    return {"message": "Manager access granted"}
```

### Available Roles

- `ADMIN` - Full system access
- `BRANCH_MANAGER` - Branch-level management
- `FIELD_OFFICER` - Field operations
- `CLERK` - Basic operations
- `CASHIER` - Cash handling

## Security Features

1. **Password Hashing**: Uses bcrypt with salt
2. **JWT Tokens**: Signed with HS256 algorithm
3. **HTTP-only Cookies**: Optional cookie-based auth (in addition to localStorage)
4. **Token Expiration**: 24 hours (configurable)
5. **CORS Protection**: Configured allowed origins
6. **SQL Injection Prevention**: Using SQLAlchemy parameterized queries
7. **Active User Check**: Ensures user status = 1

## Frontend Authentication Flow

1. User enters credentials on `/login`
2. Frontend calls `POST /api/v1/auth/login`
3. Backend validates credentials, returns JWT token
4. Frontend stores token in localStorage
5. Frontend stores user data in localStorage
6. AuthContext updates user state
7. User is redirected to protected route
8. All subsequent API calls include `Authorization: Bearer <token>` header

## Token Storage

Tokens are stored in:

- **localStorage**: `access_token` key (primary method)
- **HTTP-only cookie**: `access_token` (backup, more secure)

## Troubleshooting

### Issue: "Could not validate credentials"

- Token expired (24 hours)
- Token invalid or tampered
- User account deactivated (status != 1)

**Solution:** Logout and login again

### Issue: "Access Denied"

- User doesn't have required role

**Solution:** Contact administrator for role assignment

### Issue: Cannot login

- Check username/password
- Ensure user exists in database
- Check user status is 1 (active)

## Testing

### Test Users

Created via `python create_users.py --all`:

| Username | Password   | Role           |
| -------- | ---------- | -------------- |
| admin    | admin123   | ADMIN          |
| manager  | manager123 | BRANCH_MANAGER |
| clerk    | clerk123   | CLERK          |

### Manual Testing

1. Test login with valid credentials
2. Test login with invalid credentials
3. Test protected route access without token
4. Test protected route access with valid token
5. Test logout functionality
6. Test token expiration (wait 24 hours or modify expiry)
7. Test role-based access control

## Production Checklist

- [ ] Change SECRET_KEY in `.env`
- [ ] Change all default passwords
- [ ] Set `secure=True` for cookies (HTTPS only)
- [ ] Update CORS_ORIGINS to production URLs
- [ ] Enable HTTPS
- [ ] Set appropriate token expiration time
- [ ] Implement password reset functionality
- [ ] Add rate limiting for login attempts
- [ ] Add audit logging
- [ ] Implement refresh tokens

## Future Enhancements

- Password reset via email
- Two-factor authentication (2FA)
- Refresh token rotation
- Session management dashboard
- Login attempt logging and blocking
- Password strength requirements
- Account lockout after failed attempts
- Remember me functionality
- Social login (Google, Facebook)
