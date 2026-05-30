#!/bin/sh
cat > config.js << EOF
const SUPABASE_URL      = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
const ADMIN_EMAIL       = 'info@mcbeeskills.com';
EOF
