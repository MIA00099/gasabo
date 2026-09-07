# Env for the NATIVE APP build only: `vite build --mode app` (npm run app:build).
# The website build (`npm run build`) does not read this file, so its bundle
# keeps calling /api on its own origin exactly as before.
#
# The app has no backend of its own - point it at the deployed one. This is
# the API + image origin, no trailing slash, no /api suffix. Not a secret.
VITE_API_BASE_URL=https://www.kigalimarket.com
