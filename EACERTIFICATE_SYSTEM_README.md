# EACertificate System

A comprehensive system for managing Environmental Attribute Certificates (EACs) with full CRUD operations, built with Supabase, TypeScript, and React.

## 🏗️ System Architecture

The system is built with a modern, scalable architecture:

- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Backend**: TypeScript services with comprehensive CRUD operations
- **Frontend**: React components with TypeScript interfaces
- **Security**: Row Level Security (RLS) policies and authentication
- **Performance**: Optimized database views and indexes

## 📊 Database Schema

### Core Tables

#### 1. `eac_types` - EAC Type Definitions
```sql
CREATE TABLE public.eac_types (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,        -- e.g., 'REC', 'RTC'
    name TEXT NOT NULL,               -- e.g., 'Renewable Energy Certificate'
    description TEXT,                 -- Optional description
    is_active BOOLEAN DEFAULT true,   -- Soft delete capability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `organizations` - Organization Management
```sql
CREATE TABLE public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. `ea_certificates` - Main Certificate Table
```sql
CREATE TABLE public.ea_certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type_id INTEGER NOT NULL REFERENCES public.eac_types(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. `external_ids` - External Reference IDs
```sql
CREATE TABLE public.external_ids (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ea_certificate_id UUID NOT NULL REFERENCES public.ea_certificates(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    owner_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    owner_org_name TEXT,
    description TEXT,
    external_field_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ea_certificate_id, external_id)
);
```

#### 5. `amounts` - Certificate Amounts
```sql
CREATE TABLE public.amounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ea_certificate_id UUID NOT NULL REFERENCES public.ea_certificates(id) ON DELETE CASCADE,
    amount DECIMAL(20,6) NOT NULL,
    unit TEXT NOT NULL,
    conversion_factor DECIMAL(20,6),
    conversion_notes TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. `emissions_data` - Emissions Information
```sql
CREATE TABLE public.emissions_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ea_certificate_id UUID NOT NULL REFERENCES public.ea_certificates(id) ON DELETE CASCADE,
    carbon_intensity DECIMAL(20,6) NOT NULL,
    ci_unit TEXT,
    ci_notes TEXT,
    emissions_factor DECIMAL(20,6) NOT NULL,
    ef_unit TEXT,
    ef_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. `certificate_links` - Related Links
```sql
CREATE TABLE public.certificate_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ea_certificate_id UUID NOT NULL REFERENCES public.ea_certificates(id) ON DELETE CASCADE,
    link TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Views

#### `ea_certificate_view` - Complete Certificate Data
This view aggregates all related data into a single, queryable structure:

```sql
CREATE VIEW public.ea_certificate_view AS
SELECT 
    ec.id,
    ec.type_id,
    et.code as type_code,
    et.name as type_name,
    ec.created_at,
    ec.updated_at,
    -- External IDs as JSON
    COALESCE(json_agg(...) FILTER (WHERE ei.id IS NOT NULL), '[]'::json) as external_ids,
    -- Amounts as JSON
    COALESCE(json_agg(...) FILTER (WHERE a.id IS NOT NULL), '[]'::json) as amounts,
    -- Emissions data as JSON
    COALESCE(json_agg(...) FILTER (WHERE ed.id IS NOT NULL), '[]'::json) as emissions,
    -- Links as array
    COALESCE(array_agg(DISTINCT cl.link) FILTER (WHERE cl.id IS NOT NULL), ARRAY[]::TEXT[]) as links
FROM public.ea_certificates ec
-- ... joins and grouping
```

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

- **EAC Types**: Readable by all, modifiable by authenticated users
- **Organizations**: Readable by all, modifiable by authenticated users
- **EACertificates**: Full CRUD for authenticated users
- **Related Tables**: Inherit certificate permissions

### Authentication
- Supabase Auth integration
- User session management
- Role-based access control

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and pnpm
- Supabase CLI
- Supabase project

### 2. Installation
```bash
# Clone the repository
git clone <your-repo>
cd peach

# Install dependencies
pnpm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Database Setup
```bash
# Start Supabase locally (if using local development)
supabase start

# Apply migrations
supabase db reset

# Or apply specific migration
supabase migration up
```

### 4. Run the Application
```bash
pnpm dev
```

## 📝 API Usage

### EACertificate Service

The system provides a comprehensive service class with all CRUD operations:

```typescript
import { EACertificateService } from '@/lib/services/eacertificate-service';

// Create a new certificate
const result = await EACertificateService.createEACertificate({
  type: EACType.REC,
  externalIDs: [
    {
      id: 'REC-2024-001',
      ownerOrgId: 'org-uuid',
      description: 'Primary certificate ID'
    }
  ],
  amounts: [
    {
      amount: 1000,
      unit: 'MWh',
      isPrimary: true
    }
  ],
  emissions: [
    {
      carbonIntensity: 0,
      ciUnit: 'gCO2e/kWh',
      emissionsFactor: 0,
      efUnit: 'gCO2e/kWh'
    }
  ],
  links: ['https://example.com/certificate']
});

// Get all certificates with pagination
const certificates = await EACertificateService.getEACertificates(1, 20, {
  type: EACType.REC,
  hasEmissionsData: true
});

// Search by external ID
const certificate = await EACertificateService.searchByExternalId('REC-2024-001');

// Update certificate
const updated = await EACertificateService.updateEACertificate(id, {
  amounts: [
    {
      amount: 1500,
      unit: 'MWh',
      isPrimary: true
    }
  ]
});

// Delete certificate
const deleted = await EACertificateService.deleteEACertificate(id);
```

### Type Definitions

The system includes comprehensive TypeScript interfaces:

```typescript
import { 
  EACertificate, 
  EACType, 
  ExternalID, 
  Amount, 
  EmissionsData 
} from '@/lib/types/eacertificate';

// Main interface matching your requirements
interface EACertificate {
  id: string;
  type: EACType;
  externalIDs?: ExternalID[];
  amounts: Amount[];
  emissions?: EmissionsData[];
  links?: string[];
}

// EAC Type enum
enum EACType {
  REC = "REC",
  RTC = "Renewable Thermal Certificate",
  RNG = "RNG",
  SAF = "SAF",
  CC = "Carbon Credit",
  CR = "Carbon Removal"
}
```

## 🎨 React Components

### EACertificateForm

A comprehensive form component for creating and editing certificates:

```typescript
import EACertificateForm from '@/components/eacertificate/EACertificateForm';

function CreateCertificatePage() {
  const handleSubmit = async (data: CreateEACertificateData) => {
    try {
      const result = await createEACertificate(data);
      if (result.data) {
        // Handle success
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <EACertificateForm
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      isLoading={false}
    />
  );
}
```

## 🔍 Features

### 1. **Flexible EAC Types**
- Easy to add new EAC types without migrations
- Soft delete capability
- Rich metadata support

### 2. **Comprehensive Data Model**
- Multiple external IDs per certificate
- Multiple amounts with conversion factors
- Detailed emissions data
- Related links and documentation

### 3. **Advanced Querying**
- Pagination support
- Filtering by type, organization, date range
- Search by external ID
- Full-text search capabilities

### 4. **Data Integrity**
- Foreign key constraints
- Unique constraints on external IDs
- Automatic timestamp management
- Cascade deletes for related data

### 5. **Performance Optimizations**
- Database indexes on frequently queried fields
- Efficient JSON aggregation in views
- Optimized queries with proper joins

## 📊 Sample Data

The system includes comprehensive seed data:

- **6 EAC Types**: REC, RTC, RNG, SAF, CC, CR
- **5 Sample Organizations**: Green Energy Corp, Carbon Solutions Inc, etc.
- **6 Sample Certificates**: One of each EAC type
- **Rich Metadata**: External IDs, amounts, emissions data, and links

## 🛠️ Development

### Adding New EAC Types

```sql
-- Via SQL
INSERT INTO public.eac_types (code, name, description) 
VALUES ('BIO', 'Biodiversity Credit', 'Biodiversity Credit');

-- Via TypeScript
await addEACType('BIO', 'Biodiversity Credit', 'Biodiversity Credit');
```

### Extending the Schema

```sql
-- Add new fields to existing tables
ALTER TABLE public.eac_types 
ADD COLUMN category TEXT,
ADD COLUMN unit TEXT;

-- Add new tables
CREATE TABLE public.certificate_categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);
```

### Custom Validation

```sql
-- Ensure codes are uppercase
ALTER TABLE public.eac_types 
ADD CONSTRAINT eac_types_code_uppercase 
CHECK (code = UPPER(code));

-- Ensure amounts are positive
ALTER TABLE public.amounts 
ADD CONSTRAINT amounts_positive 
CHECK (amount > 0);
```

## 🧪 Testing

### Database Testing
```bash
# Run migrations in test environment
supabase db reset --linked

# Test specific queries
supabase db reset --linked --seed
```

### API Testing
```typescript
// Test service methods
describe('EACertificateService', () => {
  it('should create a new certificate', async () => {
    const result = await createEACertificate(sampleData);
    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });
});
```

## 🚀 Deployment

### 1. Supabase Production
```bash
# Link to production project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push

# Deploy edge functions (if any)
supabase functions deploy
```

### 2. Environment Variables
```bash
# Production environment
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📈 Performance Considerations

### Database Optimization
- **Indexes**: Created on all foreign keys and frequently queried fields
- **Views**: Efficient JSON aggregation for complex queries
- **Partitioning**: Consider partitioning large tables by date

### Application Optimization
- **Caching**: Cache frequently accessed EAC types and organizations
- **Pagination**: Implement proper pagination for large datasets
- **Lazy Loading**: Load related data on demand

## 🔒 Security Best Practices

### 1. **Input Validation**
- Validate all user inputs
- Use parameterized queries
- Sanitize data before storage

### 2. **Access Control**
- Implement proper RLS policies
- Use service role keys only for admin operations
- Regular security audits

### 3. **Data Protection**
- Encrypt sensitive data
- Implement audit logging
- Regular backup procedures

## 🐛 Troubleshooting

### Common Issues

1. **Migration Errors**
   ```bash
   # Reset database and reapply
   supabase db reset
   ```

2. **RLS Policy Issues**
   ```sql
   -- Check current policies
   SELECT * FROM pg_policies WHERE tablename = 'ea_certificates';
   ```

3. **Performance Issues**
   ```sql
   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM ea_certificate_view WHERE type_code = 'REC';
   ```

### Debug Queries

```sql
-- Check certificate data
SELECT * FROM ea_certificate_view LIMIT 5;

-- Verify relationships
SELECT 
    ec.id,
    et.code,
    COUNT(ei.id) as external_ids,
    COUNT(a.id) as amounts,
    COUNT(ed.id) as emissions
FROM ea_certificates ec
LEFT JOIN eac_types et ON ec.type_id = et.id
LEFT JOIN external_ids ei ON ec.id = ei.ea_certificate_id
LEFT JOIN amounts a ON ec.id = a.ea_certificate_id
LEFT JOIN emissions_data ed ON ec.id = ed.ea_certificate_id
GROUP BY ec.id, et.code;
```

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Make changes
3. Add tests
4. Update documentation
5. Submit pull request

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive error handling

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using modern web technologies for a sustainable future.**

