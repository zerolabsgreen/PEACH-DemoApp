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
│   └── 20240101000000_initial_schema.sql
├── seed.sql            # Initial data
└── functions/          # Edge functions (if any)
```

## Authentication Flow

The application includes:
- **Login Page**: `/auth/login`
- **Registration Page**: `/auth/register`
- **Auth Callback**: `/auth/callback`
- **Dashboard**: `/dashboard` (protected route)

## Security Features

- Row Level Security (RLS) enabled on all tables
- User profiles automatically created on signup
- Secure authentication with JWT tokens
- Email confirmation required for new accounts

## Troubleshooting

### Common Issues

1. **Port conflicts**: If ports are already in use, modify `supabase/config.toml`
2. **Docker issues**: Ensure Docker is running and has sufficient resources
3. **Migration errors**: Check the migration files for syntax errors

### Reset Everything
```bash
supabase stop
supabase start
supabase db reset
```

## Next Steps

1. Customize the database schema in `supabase/migrations/`
2. Add more tables and relationships as needed
3. Implement additional authentication providers if required
4. Add Edge Functions for server-side logic
5. Set up real-time subscriptions for live updates

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
