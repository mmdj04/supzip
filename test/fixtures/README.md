# User Management System

## Overview

This project provides a comprehensive user management system with React-based frontend components, REST API integration, and utility modules for validation and logging.

## Features

- User profile component with edit capabilities
- Custom React hooks for data fetching and mutations
- REST API client with authentication
- Input validation framework
- Structured logging system

## Installation

```bash
npm install @org/user-management
```

## Usage

```typescript
import { UserProfile, useQuery, useMutation } from '@org/user-management'
import { api } from '@org/user-management/services'
import { validate } from '@org/user-management/utils'
import { logger } from '@org/user-management/utils'
```

### User Profile Component

```tsx
<UserProfile userId="123" onUpdate={handleUpdate} />
```

### Data Fetching

```typescript
const { data, loading, error, refetch } = useQuery<User>('/users/123')
```

### API Client

```typescript
const user = await api.get<User>('/users/123')
const updated = await api.patch<User>('/users/123', { name: 'New Name' })
```

### Validation

```typescript
const rules = [
  { field: 'email', type: 'email' },
  { field: 'name', type: 'string', min: 2, max: 100 },
  { field: 'role', type: 'required' },
]
validate(data, rules)
```

## API Reference

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| UserProfile | userId, onUpdate, readOnly | Full user profile with edit form |

### Hooks

| Hook | Return Type | Description |
|------|-------------|-------------|
| useQuery | { data, loading, error, refetch } | Fetch data with loading state |
| useMutation | { execute, loading, error } | Mutate data with loading state |

### Utils

| Module | Functions | Description |
|--------|-----------|-------------|
| api | get, post, put, patch, delete | REST API client |
| logger | debug, info, warn, error | Structured logging |
| validate | validate | Input validation |

## Configuration

Set `VITE_API_URL` environment variable to configure the API base URL.

## License

MIT
