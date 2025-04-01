# 12Properties

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate a secure session secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. Update all environment variables in `.env` with your secure values

4. Required environment variables for production:
   - All SSL-related variables
   - Secure SMTP credentials
   - Valid reCAPTCHA keys
   - Strong SESSION_SECRET (minimum 64 characters)
   - Proper ALLOWED_ORIGINS

## Environment Validation

The application includes a robust environment variable validation system that runs on startup. This system:

- Validates all required environment variables
- Ensures proper format for URLs, emails, and other fields
- Enforces minimum security requirements (e.g., session secret length)
- Validates numeric ranges for ports and timeouts
- Requires SSL configuration in production
- Provides clear error messages for missing or invalid variables

### Required Variables

The following environment variables are required for the application to function:

#### Database Configuration
- `MONGODB_URI`: MongoDB connection string

#### Security
- `SESSION_SECRET`: Minimum 64 characters
- `ALLOWED_ORIGINS`: Comma-separated list of valid URLs

#### Environment
- `NODE_ENV`: Must be one of: 'development', 'production', 'test'
- `HTTP_PORT`: Positive integer
- `HTTPS_PORT`: Positive integer

#### SMTP Configuration
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (positive integer)
- `SMTP_SECURE`: Boolean ('true' or 'false')
- `SMTP_USER`: Valid email address
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: Valid email address

#### Application
- `BASE_URL`: Valid URL

#### reCAPTCHA Configuration
- `RECAPTCHA_SITE_KEY`: reCAPTCHA site key
- `RECAPTCHA_SECRET_KEY`: reCAPTCHA secret key
- `RECAPTCHA_MIN_SCORE`: Number between 0 and 1
- `RECAPTCHA_ACTION`: reCAPTCHA action name

#### Rate Limiting
- `RATE_LIMIT_WINDOW_MS`: Positive integer (milliseconds)
- `RATE_LIMIT_MAX_REQUESTS`: Positive integer
- `LOGIN_RATE_LIMIT_MAX`: Positive integer

#### Session Configuration
- `SESSION_NAME`: Session cookie name
- `SESSION_MAX_AGE`: Positive integer (milliseconds)

### Production Requirements

In production mode (`NODE_ENV=production`), the following additional requirements apply:
- SSL configuration is mandatory
- All security-related variables must be properly configured
- SMTP credentials must be valid
- reCAPTCHA keys must be configured

### Error Handling

If environment validation fails, the application will:
1. Log detailed error messages for each validation failure
2. List all missing required variables
3. Provide specific validation errors for each invalid variable
4. Exit with status code 1
5. Provide clear guidance on how to fix the issues

### Validation Process

The validation process occurs in two stages:
1. Required Variables Check:
   - Checks for presence of all required variables
   - Provides a clear list of missing variables
   - Exits immediately if any required variables are missing

2. Format and Type Validation:
   - Validates the format and type of all variables
   - Ensures security requirements are met
   - Checks production-specific requirements
   - Provides detailed error messages for each validation failure

### Future Extensions

The environment validation system is designed to be extensible:
- New validation rules can be added to the schema
- Additional required variables can be added to the `REQUIRED_VARS` array
- Custom validation functions can be added for specific requirements
- Production-specific validations can be enhanced
- Validation error messages can be customized