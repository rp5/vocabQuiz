#!/bin/bash
set -e

echo "=== Vocab Quiz Setup ==="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed."
    echo ""
    echo "Install it with one of these methods:"
    echo "  1. Download from https://nodejs.org (LTS recommended)"
    echo "  2. Using Homebrew:  brew install node"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
echo "Found Node.js $NODE_VERSION"

# Check minimum version (18+)
MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
    echo "Node.js 18+ is required. You have $NODE_VERSION."
    echo "Please update: https://nodejs.org"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To start in development:"
echo "  npm run dev"
echo "  Open http://localhost:5173"
echo ""
echo "To start in production:"
echo "  npm run build && npm start"
echo "  Open http://localhost:3000"
echo ""
echo "Kids access: http://<your-ip>:5173/quiz/login (dev)"
echo "             http://<your-ip>:3000/quiz/login (prod)"
