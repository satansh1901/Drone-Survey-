#!/bin/bash

# Drone Survey Management System - Quick Deploy Script

echo "🚀 Drone Survey Management System - Deployment"
echo "=============================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check for Mapbox token
if [ -z "$VITE_MAPBOX_ACCESS_TOKEN" ]; then
    echo "⚠️  VITE_MAPBOX_ACCESS_TOKEN environment variable not set"
    echo "Please set it with: export VITE_MAPBOX_ACCESS_TOKEN=your_token"
    echo ""
    read -p "Enter your Mapbox token: " mapbox_token
    export VITE_MAPBOX_ACCESS_TOKEN=$mapbox_token
fi

echo "✅ Prerequisites check passed"
echo ""

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/health"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
echo "🎉 Your drone survey system is now running!"
