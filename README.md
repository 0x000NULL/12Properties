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
   - Strong SESSION_SECRET
   - Proper ALLOWED_ORIGINS