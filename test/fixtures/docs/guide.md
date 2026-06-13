# User Management Guide

## Getting Started

This guide covers the basic usage of the User Management system.

### Prerequisites

- Node.js 18 or later
- A running API server

### Quick Start

```bash
npm install @org/user-management
```

Import the components and hooks you need:

```typescript
import { UserProfile, useQuery, useMutation } from '@org/user-management'
import { api } from '@org/user-management/services'
import { validate } from '@org/user-management/utils'
import { logger } from '@org/user-management/utils'
```

## Working with Data

### Fetching Data

Use the `useQuery` hook to fetch data from your API endpoint:

```typescript
const { data, loading, error, refetch } = useQuery<User>('/users/123')
```

### Mutating Data

Use the `useMutation` hook to send mutations:

```typescript
const { execute, loading, error } = useMutation<User>('/users/123')
const result = await execute({ name: 'New Name' })
```

### Direct API Calls

You can also use the API client directly:

```typescript
const user = await api.get<User>('/users/123')
const updated = await api.patch<User>('/users/123', { name: 'New Name' })
const created = await api.post<User>('/users', { name: 'New User', email: 'user@example.com' })
const deleted = await api.delete<User>('/users/123')
```

## Validation

The validation utility supports multiple rule types:

### String Validation

```typescript
validate(data, [
  { field: 'name', type: 'string', min: 2, max: 100 },
  { field: 'description', type: 'string', max: 500 },
])
```

### Email Validation

```typescript
validate(data, [
  { field: 'email', type: 'email' },
  { field: 'backupEmail', type: 'email' },
])
```

### Required Fields

```typescript
validate(data, [
  { field: 'name', type: 'required' },
  { field: 'email', type: 'required' },
  { field: 'role', type: 'required' },
])
```

## Logging

The logger supports structured logging with context:

```typescript
logger.info('UserProfile', 'User loaded', userId)
logger.error('UserProfile', 'Failed to load user', error)
logger.debug('UserProfile', 'Rendering component', { userId, readOnly })
```

## Configuration

Set environment variables to configure behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | /api | API base URL |

## Best Practices

1. Always handle loading and error states in your components
2. Use the `readOnly` prop for view-only scenarios
3. Clean up subscriptions in useEffect return functions
4. Use structured logging with context strings
5. Validate all user input before sending to the API
6. Use TypeScript generics for type-safe API calls
