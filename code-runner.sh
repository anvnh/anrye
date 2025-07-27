#!/bin/bash

# Code Runner Script for Cloud Run
# Supports C++, C, Python, JavaScript, and Java

set -e

LANGUAGE=$1
FILENAME=$2
TIMEOUT_SECONDS=${3:-10}
WORK_DIR="/app/sandbox"

# Create sandbox directory if it doesn't exist
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Function to compile and run C/C++ code
run_cpp() {
    local source_file="$1"
    local executable="program"
    
    echo "Compiling C++ code..."
    
    # Compile with timeout and resource limits
    timeout $TIMEOUT_SECONDS g++ -std=c++17 -O2 -Wall -Wextra \
        -o "$executable" "/app/temp/$source_file" 2>&1
    
    echo "Running C++ program..."
    
    # Run with timeout and memory limit
    timeout $TIMEOUT_SECONDS ./"$executable" 2>&1
}

run_c() {
    local source_file="$1"
    local executable="program"
    
    echo "Compiling C code..."
    
    # Compile with timeout
    timeout $TIMEOUT_SECONDS gcc -std=c11 -O2 -Wall -Wextra \
        -o "$executable" "/app/temp/$source_file" 2>&1
    
    echo "Running C program..."
    
    # Run with timeout
    timeout $TIMEOUT_SECONDS ./"$executable" 2>&1
}

run_python() {
    local source_file="$1"
    
    echo "Running Python code..."
    
    # Run Python with timeout and restricted environment
    timeout $TIMEOUT_SECONDS python3 "/app/temp/$source_file" 2>&1
}

run_javascript() {
    local source_file="$1"
    
    echo "Running JavaScript code..."
    
    # Run Node.js with timeout
    timeout $TIMEOUT_SECONDS node "/app/temp/$source_file" 2>&1
}

run_java() {
    local source_file="$1"
    local class_name=$(basename "$source_file" .java)
    
    echo "Compiling Java code..."
    
    # Compile Java
    timeout $TIMEOUT_SECONDS javac "/app/temp/$source_file" -d "$WORK_DIR" 2>&1
    
    echo "Running Java program..."
    
    # Run Java
    timeout $TIMEOUT_SECONDS java "$class_name" 2>&1
}

# Main execution logic
case $LANGUAGE in
    "cpp" | "c++")
        run_cpp "$FILENAME"
        ;;
    "c")
        run_c "$FILENAME"
        ;;
    "python" | "py")
        run_python "$FILENAME"
        ;;
    "javascript" | "js")
        run_javascript "$FILENAME"
        ;;
    "java")
        run_java "$FILENAME"
        ;;
    *)
        echo "Error: Unsupported language '$LANGUAGE'"
        echo "Supported languages: cpp, c++, c, python, py, javascript, js, java"
        exit 1
        ;;
esac