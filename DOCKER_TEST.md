# Docker Code Runner Test

Kiểm tra xem Docker code runner đã hoạt động chưa:

## Python Test
```python
print("Hello from Python in Docker!")
import sys
print(f"Python version: {sys.version}")

# Test with some calculations
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(f"Sum of {numbers} = {total}")

# Test with input simulation
name = "Developer"
age = 25
print(f"Hello {name}, you are {age} years old!")
```

## C++ Test
```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    cout << "Hello from C++ in Docker!" << endl;
    
    vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    
    cout << "Numbers: ";
    for(int num : numbers) {
        cout << num << " ";
        sum += num;
    }
    cout << endl;
    
    cout << "Sum: " << sum << endl;
    
    return 0;
}
```

## JavaScript Test
```javascript
console.log("Hello from JavaScript in Docker!");

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);

console.log(`Numbers: ${numbers.join(', ')}`);
console.log(`Sum: ${sum}`);

// Test with some Node.js features
const fs = require('fs');
console.log('Node.js version:', process.version);
```

Bây giờ bạn có thể:
1. Mở http://localhost:3000/editor
2. Tạo file mới với các ngôn ngữ khác nhau  
3. Copy code tests ở trên và chạy thử
4. Kiểm tra kết quả execution

Tất cả đều chạy trong Docker container an toàn và isolated!
