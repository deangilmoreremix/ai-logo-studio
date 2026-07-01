#!/bin/bash
# Install Netlify CLI if not installed
if ! command -v netlify &> /dev/null; then
    npm install -g netlify-cli
fi

# Login to Netlify
netlify login

# Build the project
npm run build

# Deploy to Netlify
netlify deploy --dir=out --prod
