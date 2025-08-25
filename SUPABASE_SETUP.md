# Supabase Setup Guide for Peach

This guide will help you set up and deploy your Supabase backend for the Peach application.

## Prerequisites

1. **Supabase CLI**: Install the Supabase CLI
   ```bash
   # Using npm
   npm install -g supabase
   
   # Using Homebrew (macOS)
   brew install supabase/tap/supabase
   
   # Using Scoop (Windows)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. **Docker**: Make sure Docker is running on your machine

3. **Environment Variables**: Ensure you have the following in your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

## Local Development Setup

### 1. Initialize Supabase (First time only)
```bash
supabase init
```

### 2. Start Local Supabase Services
```bash
supabase start
```

This will start:
- PostgreSQL database on port 54322
- Supabase API on port 54321
- Supabase Studio on port 54323
- Inbucket (email testing) on port 54324

### 3. Apply Migrations
```bash
supabase db reset
```

This will apply all migrations and seed the database.

### 4. View Local Studio
Open [http://localhost:54323](http://localhost:54323) to access Supabase Studio locally.

## Production Deployment

### 1. Link to Remote Project
```bash
supabase link --project-ref your_project_ref
```

Replace `your_project_ref` with your actual Supabase project reference ID.

### 2. Push Migrations to Production
```bash
supabase db push
```

This will apply all local migrations to your remote Supabase project.

### 3. Deploy Edge Functions (if any)
```bash
supabase functions deploy
```

## Database Schema & Architecture

### Core Design Principles

The database follows a **hybrid relational-JSONB approach** optimized for:
- **Performance**: UUID arrays for efficient JOINs
- **Flexibility**: JSONB arrays for complex nested objects
- **Security**: Proper RLS policies and validation triggers
- **Maintainability**: Clear separation of concerns

### Entity Relationships

```
EACertificates ←→ Production Sources (1:1)
EACertificates ←→ Documents (M:M via UUID arrays)
EACertificates ←→ Events (M:M via UUID arrays)
Events ←→ Documents (M:M via UUID arrays)
Organizations ←→ Documents (M:M via UUID arrays)
Production Sources ←→ Documents (M:M via UUID arrays)
Production Sources ←→ Events (M:M via JSONB arrays)
```

### Table Structure

#### **Documents Table**
- `id` (UUID, Primary Key)
- `url` (TEXT, required)
- `file_type` (ENUM: Certificate, Contract, Audit, etc.)
- `title`, `description` (optional)
- `metadata` (JSONB array of metadata objects)
- `organizations` (JSONB array of organization references)

#### **EACertificates Table**
- `id` (UUID, Primary Key)
- `type` (ENUM: REC, RTC, RNG, SAF, CC, CR)
- `external_ids` (JSONB array of external ID objects)
- `amounts` (JSONB array of amount objects)
- `emissions` (JSONB array of emissions data objects)
- `documents` (UUID array for document references)
- `events` (UUID array for event references)
- `production_source_id` (UUID foreign key to production sources)
- `links` (TEXT array)

#### **Events Table**
- `id` (UUID, Primary Key)
- `target` (ENUM: EAC, PRODUCT, PSOURCE)
- `target_id` (UUID reference to target entity)
- `type`, `description` (TEXT)
- `dates` (JSONB with start/end dates)
- `location` (JSONB location object)
- `organizations` (JSONB array of organization role objects)
- `documents` (UUID array for document references)
- `metadata` (JSONB array of metadata objects)

#### **Production Sources Table**
- `id` (UUID, Primary Key)
- `external_ids` (JSONB array of external ID objects)
- `related_production_sources` (JSONB array of related source objects)
- `name`, `description` (TEXT)
- `location` (JSONB location object, required)
- `organizations` (JSONB array of organization role objects)
- `technology` (TEXT, required)
- `events` (JSONB array of embedded event objects)
- `documents` (UUID array for document references)
- `metadata` (JSONB array of metadata objects)

#### **Organizations Table**
- `id` (UUID, Primary Key)
- `name` (TEXT, required)
- `external_ids` (JSONB array of external ID objects)
- `url`, `description` (TEXT)
- `contact` (TEXT, singular)
- `location` (JSONB array of location objects)
- `documents` (UUID array for document references)
- `metadata` (JSONB array of metadata objects)

### Data Types & Storage Strategy

#### **UUID Arrays** (for relational joins)
- `documents` fields: Store document UUIDs for efficient JOINs
- `events` fields: Store event UUIDs for efficient JOINs
- **Benefits**: Fast lookups, referential integrity, standard SQL JOINs

#### **JSONB Arrays** (for complex objects)
- `amounts`: Array of amount objects with conversion factors
- `emissions`: Array of emissions data with units and notes
- `metadata`: Array of key-value pairs with types and descriptions
- `external_ids`: Array of external identifier objects
- **Benefits**: Flexible schema, nested data, complex validation

#### **Single JSONB Objects**
- `location`: Single location object with city, state, country
- `dates`: Single date object with start/end timestamps
- **Benefits**: Structured data, validation, consistent format

## Migration History

### **Migration 1: Complete Database Setup**
- `20250825000000_complete_database_setup.sql`
- Initial schema creation with basic structure

### **Migration 2: Schema Structure Fixes**
- `20250825000001_fix_schema_structure.sql`
- Converted JSONB fields to proper arrays
- Added missing fields and relationships
- Fixed document references to use UUID arrays

### **Migration 3: Remaining Schema Issues**
- `20250825000002_fix_remaining_schema_issues.sql`
- Fixed location, events, amounts, and emissions fields
- Added missing metadata fields to all tables

### **Migration 4: JSONB Arrays & Metadata**
- `20250825000003_fix_jsonb_arrays_and_metadata.sql`
- Properly structured all JSONB fields as arrays
- Added comprehensive metadata support

### **Migration 5: Security & Function Issues**
- `20250825000004_fix_security_and_function_issues.sql`
- Fixed function search path mutable warnings
- Updated validation functions with explicit search paths

### **Migration 6: Security Definer Views**
- `20250825000005_fix_security_definer_views_final.sql`
- Fixed Security Definer View errors
- Recreated views with explicit security invoker settings

## Security Features

### **Row Level Security (RLS)**
- Enabled on all tables
- Policies enforce user-based access control
- Authenticated users can manage their own data
- Public read access for non-sensitive information

### **Function Security**
- All functions use `SECURITY DEFINER` with explicit `search_path = public`
- Prevents SQL injection attacks
- Ensures consistent behavior across environments

### **View Security**
- All views use `SECURITY INVOKER` (default)
- Views inherit caller's permissions
- No elevated privileges for view operations

### **Data Validation**
- Trigger-based validation for all critical fields
- UUID array validation ensures referential integrity
- JSONB structure validation for complex objects
- Required field validation (amounts, technology, location)

## Performance Optimizations

### **Indexes**
- Primary key indexes on all tables
- GIN indexes on UUID arrays for fast lookups
- GIN indexes on JSONB fields for efficient queries
- Composite indexes for common query patterns

### **Query Optimization**
- UUID arrays enable efficient JOINs
- JSONB arrays support complex filtering
- Views provide pre-joined data for common use cases
- Proper foreign key relationships for data integrity

## Database Management

### View Migration Status
```bash
supabase migration list
```

### Create New Migration
```bash
supabase migration new migration_name
```

### Reset Local Database
```bash
supabase db reset
```

### View Local Database
```bash
supabase db diff
```

### Check Security Advisor
```bash
# Use Supabase Dashboard → Database → Security Advisor
# Check for any remaining security warnings or errors
```

## Useful Commands

### Start/Stop Services
```bash
supabase start    # Start all services
supabase stop     # Stop all services
supabase status   # Check service status
```

### Database Operations
```bash
supabase db reset     # Reset and reseed database
supabase db push      # Push migrations to remote
supabase db pull      # Pull schema from remote
```

### Generate Types
```bash
supabase gen types typescript --local > types/supabase.ts
```

## Project Structure

```
supabase/
├── config.toml          # Supabase configuration
├── migrations/          # Database migrations
│   ├── 20250825000000_complete_database_setup.sql
│   ├── 20250825000001_fix_schema_structure.sql
│   ├── 20250825000002_fix_remaining_schema_issues.sql
│   ├── 20250825000003_fix_jsonb_arrays_and_metadata.sql
│   ├── 20250825000004_fix_security_and_function_issues.sql
│   └── 20250825000005_fix_security_definer_views_final.sql
├── seed.sql            # Initial data
└── functions/          # Edge functions (if any)
```

## Authentication Flow

The application includes:
- **Login Page**: `/auth/login`
- **Registration Page**: `/auth/register`
- **Auth Callback**: `/auth/callback`
- **Dashboard**: `/dashboard` (protected route)

## Best Practices

### **Schema Design**
- Use UUID arrays for M:M relationships that need JOINs
- Use JSONB arrays for complex nested objects
- Maintain referential integrity with foreign keys
- Keep single JSONB objects for simple structured data

### **Security**
- Always set explicit search paths in functions
- Use SECURITY INVOKER for views (default)
- Enable RLS on all tables
- Validate data at the database level

### **Performance**
- Create appropriate indexes for UUID arrays
- Use GIN indexes for JSONB fields
- Optimize views for common query patterns
- Monitor query performance with EXPLAIN ANALYZE

## Troubleshooting

### Common Issues

1. **Port conflicts**: If ports are already in use, modify `supabase/config.toml`
2. **Docker issues**: Ensure Docker is running and has sufficient resources
3. **Migration errors**: Check the migration files for syntax errors
4. **Security warnings**: Run Supabase Security Advisor to identify issues
5. **Function errors**: Ensure all functions have explicit search paths

### Reset Everything
```bash
supabase stop
supabase start
supabase db reset
```

### Fix Security Issues
```bash
# Check Security Advisor in Supabase Dashboard
# Apply any recommended security fixes
# Ensure all functions have explicit search_path
# Verify views use SECURITY INVOKER
```

## Next Steps

1. **Monitor Security Advisor** for any remaining warnings
2. **Add more validation triggers** for complex business rules
3. **Implement additional indexes** based on query patterns
4. **Add Edge Functions** for server-side logic
5. **Set up real-time subscriptions** for live updates
6. **Performance testing** with realistic data volumes

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL Arrays Documentation](https://www.postgresql.org/docs/current/arrays.html)
