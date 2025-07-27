#!/bin/bash

# Setup script for Docker Code Runner
echo "🚀 Setting up Docker Code Runner for Anrye Editor..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is installed and running"

# Check if docker compose is available
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose is available"

# Build and start the code runner container
echo "🔨 Building code runner container..."
$COMPOSE_CMD build code-runner

if [ $? -eq 0 ]; then
    echo "✅ Container built successfully"
else
    echo "❌ Failed to build container"
    exit 1
fi

# Start the container
echo "🚀 Starting code runner container..."
$COMPOSE_CMD up -d code-runner

if [ $? -eq 0 ]; then
    echo "✅ Container started successfully"
else
    echo "❌ Failed to start container"
    exit 1
fi

# Wait a moment for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 3

# Check container status
if docker ps | grep -q "anrye-code-runner"; then
    echo "🎉 Code runner is ready!"
    echo ""
    echo "📋 Container Info:"
    docker ps --filter "name=anrye-code-runner" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "💡 You can now run code in these languages:"
    echo "   • Python"
    echo "   • C/C++"
    echo "   • JavaScript (Node.js)"
    echo ""
    echo "🔧 Useful commands:"
    echo "   • Stop container: $COMPOSE_CMD stop code-runner"
    echo "   • Start container: $COMPOSE_CMD start code-runner"
    echo "   • View logs: docker logs anrye-code-runner"
    echo "   • Remove container: $COMPOSE_CMD down code-runner"
else
    echo "❌ Container failed to start properly"
    echo "📋 Checking logs..."
    docker logs anrye-code-runner
    exit 1
fi
