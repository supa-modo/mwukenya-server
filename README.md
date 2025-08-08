# MWU Kenya Server

## Database Configuration

### Overview

The database configuration now supports both `DATABASE_URL` (for production environments) and individual database variables (for development). This makes it easy to deploy to services like Railway, Heroku, and other cloud platforms.

### Configuration Options

#### 1. Production Environment (DATABASE_URL)

For production deployments, use the `DATABASE_URL` environment variable:

```bash
# Example DATABASE_URL format
DATABASE_URL=postgresql://username:password@host:port/database
```

**Features:**

- ✅ Automatic SSL configuration for production
- ✅ IPv6 support for modern hosting platforms
- ✅ Connection pooling and keep-alive settings
- ✅ Compatible with Railway, Heroku, and other cloud services

#### 2. Development Environment (Individual Variables)

For local development, you can use individual database variables:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mwukenyadb
DB_USER=postgres
DB_PASSWORD=your_password
DB_DIALECT=postgres
DB_LOGGING=true
```

### Environment Variables

| Variable       | Required    | Description                     | Example                               |
| -------------- | ----------- | ------------------------------- | ------------------------------------- |
| `DATABASE_URL` | Production  | Full database connection string | `postgresql://user:pass@host:5432/db` |
| `DB_HOST`      | Development | Database host                   | `localhost`                           |
| `DB_PORT`      | Development | Database port                   | `5432`                                |
| `DB_NAME`      | Development | Database name                   | `mwukenyadb`                          |
| `DB_USER`      | Development | Database username               | `postgres`                            |
| `DB_PASSWORD`  | Development | Database password               | `your_password`                       |
| `DB_DIALECT`   | Optional    | Database dialect                | `postgres`                            |
| `DB_LOGGING`   | Optional    | Enable SQL logging              | `true`                                |

### Deployment Examples

#### Railway Deployment

```bash
# Set in Railway environment variables
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
```

#### Heroku Deployment

```bash
# Heroku automatically provides DATABASE_URL
# Just set NODE_ENV=production
```

#### Local Development

```bash
# Copy env.example to .env and configure
cp env.example .env
# Edit .env with your local database settings
```

### IPv6 Support

The database configuration includes IPv6 support for modern hosting platforms:

- Automatically prefers IPv6 connections when available
- Falls back to IPv4 if IPv6 is not available
- Compatible with Railway and other cloud services

### Connection Features

- **Connection Pooling**: Configurable pool settings for optimal performance
- **SSL Support**: Automatic SSL configuration for production environments
- **Keep-Alive**: Connection keep-alive for better performance
- **Timeout Handling**: Configurable connection timeouts
- **Error Handling**: Comprehensive error logging and handling

### Testing Database Connection

You can test the database connection using the provided test file:

```bash
# Run the database connection test
npx ts-node src/config/database.test.ts
```

This will verify that your database configuration is working correctly with either `DATABASE_URL` or individual variables.
