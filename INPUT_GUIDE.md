# Input Handling Guide

## 🎯 **Tính năng User Input đã sẵn sàng!**

Bây giờ bạn có thể viết code tương tác với user input trong Docker environment!

### ✅ **Ngôn ngữ hỗ trợ Input:**

- **Python** - `input()` function
- **C++** - `cin >>`, `getline()`  
- **C** - `scanf()`, `gets()`

### 📝 **Cách sử dụng:**

1. **Viết code có input** trong editor
2. **Nhập input data** vào Input panel (bên phải)
3. **Click Run** để execute
4. **Xem output** với input đã được xử lý

### 🔍 **Examples:**

#### **Python Example:**
```python
name = input("Enter your name: ")
age = input("Enter your age: ")
print(f"Hello {name}, you are {age} years old!")

num1 = int(input("Enter first number: "))
num2 = int(input("Enter second number: "))
print(f"{num1} + {num2} = {num1 + num2}")
```

**Input Panel:**
```
Alice
25
10
20
```

#### **C++ Example:**
```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;
    
    cout << "Enter your name: ";
    cin >> name;
    
    cout << "Enter your age: ";
    cin >> age;
    
    cout << "Hello " << name << ", you are " << age << " years old!" << endl;
    return 0;
}
```

**Input Panel:**
```
Bob
30
```

#### **C Example:**
```c
#include <stdio.h>

int main() {
    char name[50];
    int age;
    
    printf("Enter your name: ");
    scanf("%s", name);
    
    printf("Enter your age: ");
    scanf("%d", &age);
    
    printf("Hello %s, you are %d years old!\\n", name, age);
    return 0;
}
```

### 💡 **Tips:**

1. **Mỗi dòng trong Input panel = 1 input**
2. **Input được xử lý theo thứ tự** (first line = first input)
3. **Spaces trong C++**: Dùng `getline(cin, variable)` cho strings có spaces
4. **Numbers**: Convert string input thành int/float khi cần thiết
5. **Empty lines**: Sẽ được treat như empty input

### 🧪 **Test Examples:**

Thử các examples này trong editor:

**1. Calculator (Python):**
```python
print("Simple Calculator")
a = float(input("Enter first number: "))
b = float(input("Enter second number: "))
op = input("Enter operation (+, -, *, /): ")

if op == '+':
    print(f"{a} + {b} = {a + b}")
elif op == '-':
    print(f"{a} - {b} = {a - b}")
elif op == '*':
    print(f"{a} * {b} = {a * b}")
elif op == '/':
    print(f"{a} / {b} = {a / b}")
```

**Input:**
```
10.5
5.2
+
```

**2. Grade Calculator (C++):**
```cpp
#include <iostream>
using namespace std;

int main() {
    int count;
    cout << "How many grades? ";
    cin >> count;
    
    double sum = 0;
    for(int i = 0; i < count; i++) {
        double grade;
        cout << "Enter grade " << (i+1) << ": ";
        cin >> grade;
        sum += grade;
    }
    
    cout << "Average: " << (sum / count) << endl;
    return 0;
}
```

**Input:**
```
3
85.5
92.0
78.5
```

### 🚀 **Ready to use!**

Mở http://localhost:3000/editor và thử nghiệm với input handling ngay bây giờ!
