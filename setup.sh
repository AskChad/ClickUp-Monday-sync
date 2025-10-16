#!/bin/bash

# ClickUp-Monday Sync Setup Script
# Run these commands in the project directory to complete setup

echo "Setting up ClickUp-Monday Sync Application..."

# Install production dependencies
echo "Installing dependencies..."
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install axios graphql graphql-request
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install date-fns lodash
npm install zod react-hook-form @hookform/resolvers
npm install zustand

# Install Radix UI components
npm install @radix-ui/react-dialog @radix-ui/react-select
npm install @radix-ui/react-checkbox @radix-ui/react-progress
npm install @radix-ui/react-toast

# Install dev dependencies
npm install -D @types/lodash @types/node

# Create all directories
echo "Creating project structure..."

# API directories
mkdir -p src/app/api/auth/monday
mkdir -p src/app/api/sync/start
mkdir -p src/app/api/sync/status
mkdir -p src/app/api/sync/cancel
mkdir -p src/app/api/replication/create-board
mkdir -p src/app/api/replication/analyze-list
mkdir -p src/app/api/replication/map-fields

# App page directories
mkdir -p src/app/dashboard
mkdir -p src/app/auth
mkdir -p src/app/sync
mkdir -p src/app/replicate

# Component directories
mkdir -p src/components/auth
mkdir -p src/components/sync
mkdir -p src/components/replication
mkdir -p src/components/ui

# Library directories
mkdir -p src/lib/api
mkdir -p src/lib/db
mkdir -p src/lib/sync
mkdir -p src/lib/replication
mkdir -p src/lib/utils

# Types directory
mkdir -p src/types

# Create supabase directory for migrations
mkdir -p supabase/migrations

# Copy database schema to migrations
cp database_schema.sql supabase/migrations/001_initial_schema.sql

# Create .env.local from example
cp .env.example .env.local

echo "Setup complete! Next steps:"
echo "1. Edit .env.local with your API credentials"
echo "2. Run 'npx supabase init' to initialize Supabase"
echo "3. Run 'npx supabase db push' to apply migrations"
echo "4. Run 'npm run dev' to start development"