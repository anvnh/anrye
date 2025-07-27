#!/bin/bash

# Health check script for Docker Code Runner
echo "🔍 Checking Docker Code Runner status..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    exit 1
fi

# Check if container exists and is running
if docker ps | grep -q "anrye-code-runner"; then
    echo "✅ Code runner container is running"
    
    # Show container details
    echo ""
    echo "📋 Container Details:"
    docker ps --filter "name=anrye-code-runner" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
    
    # Test API endpoint if Next.js is running
    echo ""
    echo "🔗 Testing API endpoint..."
    if curl -s http://localhost:3000/api/execute > /dev/null 2>&1; then
        echo "✅ API endpoint is accessible"
    else
        echo "⚠️  API endpoint not accessible (Next.js may not be running)"
        echo "   Run: npm run dev or pnpm dev"
    fi
    
    # Test simple execution
    echo ""
    echo "🧪 Testing code execution..."
    
    # Create a simple test file
    echo 'print("Hello from Docker!")' > temp/test.py
    
    # Execute test
    if docker exec anrye-code-runner /app/code-runner.sh python test.py > /dev/null 2>&1; then
        echo "✅ Code execution test passed"
        # Clean up
        rm -f temp/test.py output/output.txt output/error.txt
    else
        echo "❌ Code execution test failed"
    fi
    
elif docker ps -a | grep -q "anrye-code-runner"; then
    echo "⚠️  Code runner container exists but is not running"
    echo "💡 Start it with: docker-compose start code-runner"
else
    echo "❌ Code runner container not found"
    echo "💡 Run setup first: ./setup-docker.sh"
fi

echo ""
echo "🔧 Quick commands:"
echo "   • View logs: docker logs anrye-code-runner"
echo "   • Restart: docker-compose restart code-runner"
echo "   • Shell access: docker exec -it anrye-code-runner bash"
