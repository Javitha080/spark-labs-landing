# Admin Setup Guide

This application uses database-only admin creation for maximum security. There is no signup page - admins must be created directly in the database.

## How to Add an Admin User

### Step 1: Create the User Account
First, you need to create the user in Supabase Auth. You can do this in two ways:

#### Option A: Using Supabase Dashboard
1. Go to your Lovable Cloud backend
2. Navigate to Authentication → Users
3. Click "Add User"
4. Enter the admin's email and password
5. Note the User ID that is created

#### Option B: Using SQL
```sql
-- This will be done automatically when the user signs up via the Auth system
-- You'll need to use the Supabase Dashboard or Auth API to create the initial user
```

### Step 2: Add Admin Role
Once the user is created, run this SQL query to grant them admin privileges:

```sql
-- Replace 'USER_ID_HERE' with the actual UUID of the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');
```

### Complete Example

If you want to add admin@example.com as an admin:

1. Create the user via Supabase Dashboard Authentication → Users
   - Email: admin@example.com
   - Password: (set a strong password)
   - Copy the generated User ID (e.g., `123e4567-e89b-12d3-a456-426614174000`)

2. Run this SQL query:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin');
```

3. The user can now log in at `/admin/login`

## Security Notes

- ✅ Admin roles are verified server-side using RLS policies
- ✅ Only users with the 'admin' role in user_roles table can access admin pages
- ✅ No signup page prevents unauthorized account creation
- ✅ Admin status cannot be manipulated client-side
- ✅ All admin operations are protected by Row Level Security

## Verifying Admin Access

To check if a user has admin access:

```sql
SELECT ur.role, p.email, p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

## Removing Admin Access

To revoke admin privileges:

```sql
DELETE FROM public.user_roles 
WHERE user_id = 'USER_ID_HERE' 
AND role = 'admin';
```
