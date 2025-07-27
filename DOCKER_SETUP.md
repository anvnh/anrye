# Docker Code Runner - Complete Setup

## 🎯 **Tính năng hoàn chỉnh:**

✅ **Docker Environment** - Ubuntu 22.04 với GCC, Python, Node.js  
✅ **Multi-language Support** - Python, C++, C, JavaScript  
✅ **User Input Handling** - Hỗ trợ interactive programs  
✅ **Real-time Compilation** - Compile và run trong container  
✅ **Web Interface** - CodeMirror editor với syntax highlighting  

## 🚀 **Cách chạy:**

### 1. **Khởi động Docker:**
```bash
# Start container
docker-compose up -d

# Check status
docker ps
```

### 2. **Start Next.js app:**
```bash
# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev
```

### 3. **Access Editor:**
Mở browser: **http://localhost:3000/editor**

## 🔧 **Kiến trúc hệ thống:**

```
┌─ Browser (CodeMirror Editor)
│
├─ Next.js API (/api/execute)
│  ├─ Nhận code + input
│  ├─ Ghi file vào container
│  └─ Thực thi qua docker exec
│
└─ Docker Container (code-runner)
   ├─ Ubuntu 22.04
   ├─ GCC/G++ compiler
   ├─ Python 3.10
   ├─ Node.js 18
   └─ code-runner.sh script
```

## 📂 **Files quan trọng:**

- `Dockerfile.code-runner` - Container definition
- `docker-compose.yml` - Service orchestration  
- `code-runner.sh` - Execution script
- `app/api/execute/route.ts` - API endpoint
- `app/editor/page.tsx` - Editor interface

## 🔍 **Debugging:**

### **Container Issues:**
```bash
# Check container status
docker ps -a

# View container logs
docker logs code-runner

# Enter container for debugging
docker exec -it code-runner bash
```

### **Permission Issues:**
```bash
# Fix container permissions (if needed)
docker exec code-runner chmod 777 /tmp
```

### **API Testing:**
```bash
# Test Python execution
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"Hello World!\")", "language":"python"}'

# Test with input
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"name=input(\"Name: \");print(f\"Hello {name}!\")", "language":"python", "input":"Alice"}'
```

## 🛠 **Setup Commands:**

Tất cả commands đã chạy thành công:

```bash
# Container build & start
docker-compose up -d ✅

# Permission setup  
docker exec code-runner chmod +x /tmp/code-runner.sh ✅

# Test execution
curl tests ✅
```

## 📋 **Support Matrix:**

| Language | Compile | Run | Input | Status |
|----------|---------|-----|-------|--------|
| Python   | ✅      | ✅  | ✅    | ✅ Full |
| C++      | ✅      | ✅  | ✅    | ✅ Full |
| C        | ✅      | ✅  | ✅    | ✅ Full |
| JavaScript| ✅     | ✅  | ✅    | ✅ Full |

## 🎯 **Next Steps:**

1. **Test editor**: http://localhost:3000/editor
2. **Try examples**: Xem `INPUT_GUIDE.md` 
3. **Add more languages**: Modify `code-runner.sh` if needed
4. **Performance tuning**: Optimize container if required

**🎉 System sẵn sàng sử dụng!**

2. Open the editor at http://localhost:3000/editor

3. Create or select a file (Python, C++, C, JavaScript)

4. Click the "Run" button to execute your code

## Supported Languages

- **Python** (.py files)
  - Full Python 3 with popular packages (numpy, pandas, matplotlib, etc.)
  - Input/output support
  - 10-second execution timeout

- **C++** (.cpp files)
  - GCC compiler
  - Standard libraries
  - Compilation + execution

- **C** (.c files)
  - GCC compiler
  - Standard C libraries

- **JavaScript** (.js files)
  - Node.js runtime
  - Built-in modules support

- **HTML** (.html files)
  - Opens in new browser tab/window

## Container Management

### Check Status
```bash
./check-docker.sh
```

### Common Commands
```bash
# Start container
docker-compose start code-runner

# Stop container
docker-compose stop code-runner

# Restart container
docker-compose restart code-runner

# View logs
docker logs anrye-code-runner

# Access container shell
docker exec -it anrye-code-runner bash

# Remove container (will need to rebuild)
docker-compose down code-runner
```

## File Structure

```
project/
├── Dockerfile.code-runner      # Container definition
├── docker-compose.yml         # Service configuration
├── code-runner.sh             # Execution script
├── setup-docker.sh            # Setup automation
├── check-docker.sh            # Status checker
├── temp/                      # Temporary code files
├── output/                    # Execution output
└── app/api/execute/route.ts   # API endpoint
```

## Troubleshooting

### Container Won't Start
```bash
# Check Docker daemon
docker info

# Check container logs
docker logs anrye-code-runner

# Rebuild container
docker-compose build --no-cache code-runner
docker-compose up -d code-runner
```

### API Errors
1. Make sure Next.js server is running (`pnpm dev`)
2. Check if container is running (`./check-docker.sh`)
3. Verify API endpoint: http://localhost:3000/api/execute

### Permission Issues
```bash
# Fix file permissions
chmod +x setup-docker.sh
chmod +x check-docker.sh
chmod +x code-runner.sh

# Fix directory permissions
sudo chown -R $USER:$USER temp/ output/
```

### Timeout Issues
- Default timeout is 10 seconds
- Modify `code-runner.sh` to change timeout
- Add `timeout 30s` for 30-second timeout

## Security Notes

- Code execution is sandboxed in Docker container
- No network access from executed code
- Automatic cleanup of temporary files
- 10-second execution timeout prevents infinite loops

## Development

### Adding New Languages

1. Edit `Dockerfile.code-runner` to install required tools
2. Update `code-runner.sh` to handle the new language
3. Update `app/api/execute/route.ts` file extensions
4. Add language to editor's language list

### Customizing Environment

Edit `Dockerfile.code-runner` to:
- Install additional packages
- Change base image
- Add development tools
- Configure environment variables

## Performance

- Container startup: ~2-3 seconds
- Code execution: Varies by complexity
- Memory limit: Container default (adjust in docker-compose.yml)
- CPU limit: No limit set (can be configured)

## Alternative Solutions

If Docker setup is too complex, consider:

1. **Online Compilers**: Judge0 API, Sphere Engine
2. **Local Installation**: Install compilers directly
3. **Browser-only**: Pyodide for Python, WebAssembly for C++
4. **Code Sandbox**: Embed external code runners
