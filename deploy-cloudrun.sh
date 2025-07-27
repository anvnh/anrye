#!/bin/bash

# Google Cloud Run Deployment Script for Code Editor
# Usage: ./deploy-cloudrun.sh [PROJECT_ID] [REGION]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_REGION="asia-southeast1"
SERVICE_NAME="anrye"

# Get project ID and region
PROJECT_ID=${1}
REGION=${2:-$DEFAULT_REGION}

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID is required${NC}"
    echo "Usage: $0 <PROJECT_ID> [REGION]"
    echo "Example: $0 my-project-id asia-southeast1"
    exit 1
fi

echo -e "${BLUE}🚀 Starting deployment to Google Cloud Run...${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}You need to authenticate with Google Cloud${NC}"
    gcloud auth login
fi

# Set project
echo -e "${YELLOW}📝 Setting project to $PROJECT_ID...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy using Cloud Build
echo -e "${YELLOW}🏗️ Building and deploying with Cloud Build...${NC}"
gcloud builds submit --config cloudbuild.yaml

echo -e "${GREEN}🎉 Deployment completed!${NC}"

# Get service URL
echo -e "${YELLOW}🔍 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

if [ -n "$SERVICE_URL" ]; then
    echo -e "${GREEN}🌐 Your app is now running at: ${BLUE}$SERVICE_URL${NC}"
    
    # Test the health endpoint
    echo -e "${YELLOW}🩺 Testing health endpoint...${NC}"
    if curl -s "$SERVICE_URL/api/execute" | grep -q "ok"; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
    else
        echo -e "${YELLOW}⚠️ Health check failed, but service is deployed${NC}"
    fi
    
    # Display useful commands
    echo -e "\n${BLUE}📋 Useful commands:${NC}"
    echo "View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
    echo "Service info: gcloud run services describe $SERVICE_NAME --region=$REGION"
    echo "Update service: gcloud run services update $SERVICE_NAME --region=$REGION"
    
    # Optional: Open in browser
    read -p "🔗 Open the deployed app in browser? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$SERVICE_URL"
        elif command -v open &> /dev/null; then
            open "$SERVICE_URL"
        else
            echo "Please open $SERVICE_URL in your browser"
        fi
    fi
else
    echo -e "${RED}❌ Could not retrieve service URL${NC}"
    echo "Check the Cloud Console for deployment status"
fi
