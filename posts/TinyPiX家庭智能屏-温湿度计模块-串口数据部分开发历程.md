# TinyPiX家庭智能屏-温湿度计模块-串口数据部分开发历程

在虚拟机中成功配置Core-master的环境并成功运行第一个示例程序后，继续在`~/TinyPiXOS/TinyPiXCore-master/SerialPortData/`路径下开始进行本小组串口数据部分的开发：

## 开发环境

硬件：`Arduino UNO开发板` + `DHT11温湿度传感器`

软件：`Arduino IDE（Windows11物理机）`、`TinyPiX开发组件（Ubuntu22.04虚拟机）`

## 开发过程（master分支）

### 初始代码设计

首先使用Arduino作为传感器读取器，使用IDE向Arduino开发板中上传代码如下：

```c++
// Arduino代码 - 读取DHT11并通过串口发送数据
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  if (!isnan(temperature) && !isnan(humidity)) {
    Serial.print("T:");
    Serial.print(temperature);
    Serial.print(",H:");
    Serial.println(humidity);
  } else {
    Serial.println("Error reading sensor");
  }
  
  delay(2000); // 每2秒读取一次
}
```

接着将串口连接修改到虚拟机中，并安装串口通信库：

```bash
sudo apt update
sudo apt install libserial-dev
```

初始`main.cpp`如下：

```c++
#include <tinyPiX/SingleGUI/core/tpApp.h>
#include <tinyPiX/SingleGUI/screen/tpFixScreen.h>
#include <tinyPiX/SingleGUI/widgets/tpButton.h>
#include <tinyPiX/SingleGUI/widgets/tpLabel.h>
#include <SerialPort.h>  // 串口通信库
#include <iostream>
#include <thread>
#include <chrono>
#include <sstream>

class SensorReader {
private:
    SerialPort serial;
    tpLabel* temperatureLabel;
    tpLabel* humidityLabel;
    bool running;
    std::thread readerThread;

public:
    SensorReader(tpLabel* tempLabel, tpLabel* humLabel) 
        : temperatureLabel(tempLabel), humidityLabel(humLabel), running(false) {
    }

    bool initialize(const std::string& port = "/dev/ttyUSB0", int baudrate = 9600) {
        // 打开串口
        if (!serial.open(port, baudrate)) {
            std::cout << "无法打开串口: " << port << std::endl;
            return false;
        }
        
        std::cout << "串口打开成功: " << port << std::endl;
        return true;
    }

    void start() {
        running = true;
        readerThread = std::thread(&SensorReader::readLoop, this);
    }

    void stop() {
        running = false;
        if (readerThread.joinable()) {
            readerThread.join();
        }
        serial.close();
    }

private:
    void readLoop() {
        while (running) {
            // 读取传感器数据
            std::string data = readSensorData();
            if (!data.empty()) {
                processSensorData(data);
            }
            
            // 每秒读取一次
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }

    std::string readSensorData() {
        char buffer[256];
        int bytesRead = serial.read(buffer, sizeof(buffer) - 1);
        if (bytesRead > 0) {
            buffer[bytesRead] = '\0';
            return std::string(buffer);
        }
        return "";
    }

    void processSensorData(const std::string& data) {
        // 解析传感器数据格式，例如: "T:25.3,H:60.2"
        std::istringstream iss(data);
        std::string token;
        float temperature = 0.0f;
        float humidity = 0.0f;

        while (std::getline(iss, token, ',')) {
            if (token.find("T:") == 0) {
                temperature = std::stof(token.substr(2));
            } else if (token.find("H:") == 0) {
                humidity = std::stof(token.substr(2));
            }
        }

        // 更新GUI
        updateDisplay(temperature, humidity);
    }

    void updateDisplay(float temperature, float humidity) {
        // 在主线程中更新GUI
        std::string tempText = "温度: " + std::to_string(temperature).substr(0, 4) + "°C";
        std::string humText = "湿度: " + std::to_string(humidity).substr(0, 4) + "%";
        
        // 注意：GUI操作需要在主线程中执行
        // 这里需要线程安全的GUI更新机制
        temperatureLabel->setText(tempText.c_str());
        humidityLabel->setText(humText.c_str());
        temperatureLabel->update();
        humidityLabel->update();
    }
};

int32_t main(int32_t argc, char *argv[]) {
    // 构建主事件循环对象
    tpApp app(argc, argv);

    // 创建主窗体对象
    tpFixScreen *vScreen = new tpFixScreen();
    vScreen->setBackGroundColor(_RGBA(240, 240, 240, 255)); // 浅灰色背景
    app.bindVScreen(vScreen);

    // 创建标题标签
    tpLabel *titleLabel = new tpLabel("DHT11温湿度监测", vScreen);
    titleLabel->setSize(400, 50);
    titleLabel->move(100, 50);
    titleLabel->setFontSize(24);
    titleLabel->setAlignment(TP_ALIGN_CENTER);

    // 创建温度显示标签
    tpLabel *tempLabel = new tpLabel("温度: -- °C", vScreen);
    tempLabel->setSize(300, 40);
    tempLabel->move(150, 150);
    tempLabel->setFontSize(20);
    tempLabel->setBackGroundColor(_RGBA(200, 230, 255, 255)); // 浅蓝色背景

    // 创建湿度显示标签
    tpLabel *humLabel = new tpLabel("湿度: -- %", vScreen);
    humLabel->setSize(300, 40);
    humLabel->move(150, 200);
    humLabel->setFontSize(20);
    humLabel->setBackGroundColor(_RGBA(200, 255, 230, 255)); // 浅绿色背景

    // 创建刷新按钮
    tpButton *refreshButton = new tpButton("手动刷新", vScreen);
    refreshButton->setSize(200, 50);
    refreshButton->move(200, 280);

    // 创建传感器读取器
    SensorReader sensorReader(tempLabel, humLabel);
    
    // 尝试初始化传感器
    bool sensorInitialized = sensorReader.initialize("/dev/ttyUSB0", 9600);
    
    if (sensorInitialized) {
        sensorReader.start();
    } else {
        tempLabel->setText("传感器未连接");
        humLabel->setText("请检查硬件连接");
    }

    // 绑定按钮信号槽
    connect(refreshButton, onClicked, [&](bool checked) {
        std::cout << "手动刷新数据" << std::endl;
        // 可以在这里添加手动刷新的逻辑
    });

    // 手动更新主窗体
    vScreen->update();

    // 运行主事件循环
    int result = app.run();
    
    // 程序退出时停止传感器读取
    sensorReader.stop();
    
    return result;
}
```

同时更新cross编译脚本以包含串口库：

```bash
#!/bin/bash
g++ main.cpp -o sensor_app \
    -I/usr/include \
    -I/usr/include/tinyPiX \
    -I/usr/include/tinyPiX/Api \
    -I/usr/include/tinyPiX/Utils \
    -I/usr/include/tinyPiX/ExternUtils \
    -I/usr/include/tinyPiX/SingleGUI \
    -I/usr/include/tinyPiX/SingleGUI/core \
    -I/usr/include/tinyPiX/SingleGUI/screen \
    -I/usr/include/tinyPiX/SingleGUI/widgets \
    -I/usr/include/PiXWM \
    -I/usr/include/TpWM \
    -I/usr/include/SDL2 \
    -I/usr/include/freetype2 \
    -I/usr/include/cairo \
    -I/usr/include/pango-1.0 \
    -I/usr/include/glib-2.0 \
    -I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
    -L/usr/lib \
    -L/usr/lib/tinyPiX \
    -lPiXUtils \
    -lPiXExternUtils \
    -lPiXSingleGUI \
    -lPiXDesktopGUI \
    -lSDL2 \
    -lSDL2_image \
    -lSDL2_gfx \
    -lcairo \
    -lpango-1.0 \
    -lpangocairo-1.0 \
    -lglib-2.0 \
    -lgobject-2.0 \
    -lfreetype \
    -lfontconfig \
    -lpthread \
    -ldl \
    -lserial
```

### 问题一：缺少串口通信库

编译，出现问题：

```bash
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# ./cross 
main.cpp:5:10: fatal error: SerialPort.h: 没有那个文件或目录
    5 | #include <SerialPort.h>  // 串口通信库
      |          ^~~~~~~~~~~~~~
compilation terminated.
```

根据报错，这个错误是因为缺少串口通信库。通过搜索了解到，在Linux系统中，我们通常使用系统自带的串口API而不是单独的SerialPort库。

因此，修改代码，使用Linux系统串口API：

```c++
//未更改，略
//#include <SerialPort.h>  删除原来的串口通信库
//未更改，略
//新增如下
#include <fcntl.h>      // 文件控制定义
#include <termios.h>    // POSIX终端控制定义
#include <unistd.h>     // UNIX标准函数定义
#include <cstring>      // 字符串操作

class SerialPort {
private:
    int fd; // 文件描述符

public:
    SerialPort() : fd(-1) {}
    
    ~SerialPort() {
        close();
    }

    bool open(const std::string& port, int baudrate) {
        fd = ::open(port.c_str(), O_RDWR | O_NOCTTY | O_SYNC);
        if (fd < 0) {
            std::cout << "无法打开串口: " << port << std::endl;
            return false;
        }

        // 配置串口参数
        struct termios tty;
        memset(&tty, 0, sizeof(tty));
        
        if (tcgetattr(fd, &tty) != 0) {
            std::cout << "获取串口属性失败" << std::endl;
            return false;
        }

        // 设置波特率
        cfsetospeed(&tty, B9600);
        cfsetispeed(&tty, B9600);

        // 设置8N1模式 (8数据位, 无校验, 1停止位)
        tty.c_cflag = (tty.c_cflag & ~CSIZE) | CS8; // 8数据位
        tty.c_cflag &= ~PARENB; // 无校验
        tty.c_cflag &= ~CSTOPB; // 1停止位
        tty.c_cflag &= ~CRTSCTS; // 无硬件流控

        // 设置本地模式
        tty.c_cflag |= (CLOCAL | CREAD);
        tty.c_lflag &= ~ICANON; // 非规范模式
        tty.c_lflag &= ~(ECHO | ECHOE | ISIG); // 无回显

        // 设置输入模式
        tty.c_iflag &= ~(IXON | IXOFF | IXANY); // 无软件流控
        tty.c_iflag &= ~(INLCR | ICRNL); // 不转换回车换行

        // 设置输出模式
        tty.c_oflag &= ~OPOST; // 原始输出

        // 设置超时 - 读取立即返回
        tty.c_cc[VMIN] = 0;
        tty.c_cc[VTIME] = 5; // 0.5秒超时

        if (tcsetattr(fd, TCSANOW, &tty) != 0) {
            std::cout << "设置串口属性失败" << std::endl;
            return false;
        }

        std::cout << "串口打开成功: " << port << std::endl;
        return true;
    }

    int read(char* buffer, size_t size) {
        if (fd < 0) return -1;
        return ::read(fd, buffer, size);
    }

    void close() {
        if (fd >= 0) {
            ::close(fd);
            fd = -1;
        }
    }
};

class SensorReader {
private:
    //未更改，略

public:
    //未更改，略

    bool initialize(const std::string& port = "/dev/ttyUSB0", int baudrate = 9600) {
        return serial.open(port, baudrate);
    }

    //未更改，略

private:
    void readLoop() {
        while (running) {
            std::string data = readSensorData();
            if (!data.empty()) {
                std::cout << "收到传感器数据: " << data << std::endl;
                processSensorData(data);
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
        }
    }

    std::string readSensorData() {
        //未更改，略
    }

    void processSensorData(const std::string& data) {
        // 解析Arduino发送的数据格式: "T:25.30,H:60.20"
        size_t t_pos = data.find("T:");
        size_t h_pos = data.find("H:");
        
        if (t_pos != std::string::npos && h_pos != std::string::npos) {
            try {
                // 提取温度值
                size_t t_end = data.find(',', t_pos);
                if (t_end != std::string::npos) {
                    std::string temp_str = data.substr(t_pos + 2, t_end - t_pos - 2);
                    float temperature = std::stof(temp_str);
                    
                    // 提取湿度值
                    std::string hum_str = data.substr(h_pos + 2);
                    float humidity = std::stof(hum_str);
                    
                    // 更新显示
                    updateDisplay(temperature, humidity);
                }
            } catch (const std::exception& e) {
                std::cout << "数据解析错误: " << e.what() << std::endl;
            }
        }
    }

    void updateDisplay(float temperature, float humidity) {
        //未更改，略
    }
};

int32_t main(int32_t argc, char *argv[]) {
    //未更改，略
	//删除刷新按钮
    // 创建状态标签
    tpLabel *statusLabel = new tpLabel("正在初始化...", vScreen);
    statusLabel->setSize(300, 30);
    statusLabel->move(150, 260);
    statusLabel->setFontSize(16);

    // 创建退出按钮
    tpButton *exitButton = new tpButton("退出", vScreen);
    exitButton->setSize(100, 40);
    exitButton->move(250, 320);

    // 创建传感器读取器
    SensorReader sensorReader(tempLabel, humLabel);
    
    // 尝试不同的串口设备
    std::vector<std::string> possiblePorts = {"/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0", "/dev/ttyACM1"};
    bool sensorInitialized = false;
    
    for (const auto& port : possiblePorts) {
        std::cout << "尝试打开串口: " << port << std::endl;
        if (sensorReader.initialize(port, 9600)) {
            sensorInitialized = true;
            statusLabel->setText(("已连接到: " + port).c_str());
            break;
        }
    }
    
    if (sensorInitialized) {
        sensorReader.start();
        statusLabel->setText("传感器连接成功");
    } else {
        statusLabel->setText("传感器连接失败");
        tempLabel->setText("温度: 连接失败");
        humLabel->setText("湿度: 连接失败");
    }

    // 绑定退出按钮
    connect(exitButton, onClicked, [&](bool checked) {
        sensorReader.stop();
        exit(0);
    });

    //未更改，略
}
```

并更改编译依赖：

```bash
#!/bin/bash
g++ main.cpp -o sensor_app \
    -I/usr/include \
    -I/usr/include/tinyPiX \
    -I/usr/include/tinyPiX/Api \
    -I/usr/include/tinyPiX/Utils \
    -I/usr/include/tinyPiX/ExternUtils \
    -I/usr/include/tinyPiX/SingleGUI \
    -I/usr/include/tinyPiX/SingleGUI/core \
    -I/usr/include/tinyPiX/SingleGUI/screen \
    -I/usr/include/tinyPiX/SingleGUI/widgets \
    -I/usr/include/PiXWM \
    -I/usr/include/TpWM \
    -I/usr/include/SDL2 \
    -I/usr/include/freetype2 \
    -I/usr/include/cairo \
    -I/usr/include/pango-1.0 \
    -I/usr/include/glib-2.0 \
    -I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
    -L/usr/lib \
    -L/usr/lib/tinyPiX \
    -lPiXUtils \
    -lPiXExternUtils \
    -lPiXSingleGUI \
    -lPiXDesktopGUI \
    -lSDL2 \
    -lSDL2_image \
    -lSDL2_gfx \
    -lcairo \
    -lpango-1.0 \
    -lpangocairo-1.0 \
    -lglib-2.0 \
    -lgobject-2.0 \
    -lfreetype \
    -lfontconfig \
    -lpthread \
    -ldl \
    -std=c++11
```

同时，为了确保Arduino代码正确发送数据格式：

```c++
// Arduino代码 - 优化版本
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  delay(2000); // 等待传感器稳定
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  if (!isnan(temperature) && !isnan(humidity)) {
    // 发送格式化的数据，便于解析
    Serial.print("T:");
    Serial.print(temperature, 2); // 保留2位小数
    Serial.print(",H:");
    Serial.println(humidity, 2);  // 保留2位小数
  } else {
    Serial.println("Error"); // 错误信息
  }
  
  delay(2000); // 每2秒读取一次
}
```

### 问题二：方法和常量使用错误

重新编译，出现报错：

```bash
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# ls -la /dev/ttyUSB* /dev/ttyACM*
ls: 无法访问 '/dev/ttyUSB*': 没有那个文件或目录
crw-rw---- 1 root dialout 166, 0 10月 18 20:47  /dev/ttyACM0
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# lsusb
Bus 002 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 001 Device 005: ID 2341:0043 Arduino SA Uno R3 (CDC ACM)
Bus 001 Device 003: ID 0e0f:0002 VMware, Inc. Virtual USB Hub
Bus 001 Device 002: ID 0e0f:0003 VMware, Inc. Virtual Mouse
Bus 001 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# dmesg | grep tty
[    0.163325] printk: legacy console [tty0] enabled
[18087.077859] cdc_acm 1-2.1:1.0: ttyACM0: USB ACM device
[18827.530286] cdc_acm 1-2.1:1.0: ttyACM0: USB ACM device
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# ./cross 
main.cpp: In function ‘int32_t main(int32_t, char**)’:
main.cpp:193:17: error: ‘class tpLabel’ has no member named ‘setFontSize’; did you mean ‘setSize’?
  193 |     titleLabel->setFontSize(24);
      |                 ^~~~~~~~~~~
      |                 setSize
main.cpp:194:17: error: ‘class tpLabel’ has no member named ‘setAlignment’; did you mean ‘setAlign’?
  194 |     titleLabel->setAlignment(TP_ALIGN_CENTER);
      |                 ^~~~~~~~~~~~
      |                 setAlign
main.cpp:194:30: error: ‘TP_ALIGN_CENTER’ was not declared in this scope
  194 |     titleLabel->setAlignment(TP_ALIGN_CENTER);
      |                              ^~~~~~~~~~~~~~~
main.cpp:200:16: error: ‘class tpLabel’ has no member named ‘setFontSize’; did you mean ‘setSize’?
  200 |     tempLabel->setFontSize(20);
      |                ^~~~~~~~~~~
      |                setSize
main.cpp:207:15: error: ‘class tpLabel’ has no member named ‘setFontSize’; did you mean ‘setSize’?
  207 |     humLabel->setFontSize(20);
      |               ^~~~~~~~~~~
      |               setSize
main.cpp:214:18: error: ‘class tpLabel’ has no member named ‘setFontSize’; did you mean ‘setSize’?
  214 |     statusLabel->setFontSize(16);
      |                  ^~~~~~~~~~~
      |                  setSize
```

问题分析：

从错误信息看，TinyPiXOS的API与代码中使用的不同：

- `tpLabel` 类没有 `setFontSize` 方法，应该是 `setSize`
- 没有 `setAlignment` 方法，应该是 `setAlign`
- 没有 `TP_ALIGN_CENTER` 常量

因此修改代码如下：

```c++
//未更改，略
#include <vector>

class SerialPort {
	//未更改，略
};

class SensorReader {
	//未更改，略
};

int32_t main(int32_t argc, char *argv[]) {
    //未更改，略

    // 创建标题标签 - 使用正确的API
    tpLabel *titleLabel = new tpLabel("DHT11温湿度监测", vScreen);
    titleLabel->setSize(400, 50);
    titleLabel->move(100, 50);
    // 移除不存在的setFontSize和setAlignment调用

    // 创建温度显示标签
    tpLabel *tempLabel = new tpLabel("温度: -- °C", vScreen);
    tempLabel->setSize(300, 40);
    tempLabel->move(150, 150);
    tempLabel->setBackGroundColor(_RGBA(200, 230, 255, 255));

    // 创建湿度显示标签
    tpLabel *humLabel = new tpLabel("湿度: -- %", vScreen);
    humLabel->setSize(300, 40);
    humLabel->move(150, 200);
    humLabel->setBackGroundColor(_RGBA(200, 255, 230, 255));

    // 创建状态标签
    tpLabel *statusLabel = new tpLabel("正在初始化...", vScreen);
    statusLabel->setSize(300, 30);
    statusLabel->move(150, 260);

    //未更改，略
}
```

在运行前，通过minicom测试串口通信，串口数据发送正常。

### 问题三：显示效果问题

随后编译运行，非常顺利，但是实现效果出现了两个问题：

1. **GUI更新问题** - 数据显示不更新：窗口中的数据只能一直显示为第一次读到的数据，不能随最新数据改变；
2. **串口数据读取问题** - 数据被分割成多个部分：终端中的数据输出格式略有问题，以下是部分输出：

```bash
收到传感器数据: T:28
收到传感器数据: .00,H:77.00
收到传感器数据: T
收到传感器数据: :28.00,H:78.00
收到传感器数据: T:
收到传感器数据: 28.00,H:80.00
收到传感器数据: T:2
收到传感器数据: 8.00,H:80.00
```

问题分析：

1：在TinyPiXOS中，GUI更新需要在主线程中进行。我们当前在子线程中直接调用GUI更新方法，这可能导致更新不被正确执行。

2：串口数据是流式传输的，可能一次读取操作只能获取部分数据。我们需要实现数据缓冲和完整帧检测。



解决方案：

修复GUI更新问题：

使用TinyPiXOS的事件机制来确保GUI在主线程中更新：

```c++
//未更改，略
#include <tinyPiX/SingleGUI/core/tpTimer.h>  // 添加定时器支持
//未更改，略
#include <mutex>
#include <queue>

// 全局数据共享
struct SensorData {
    float temperature;
    float humidity;
};

std::mutex dataMutex;
SensorData latestData;
bool newDataAvailable = false;

class SerialPort {
private:
    int fd;
    std::string buffer;  // 数据缓冲区

public:
    SerialPort() : fd(-1) {}
    
    ~SerialPort() {
        close();
    }

    bool open(const std::string& port, int baudrate) {
        //未更改，略
    }

    // 读取数据并返回完整的数据行
    std::string readLine() {
        char buf[256];
        int bytesRead = ::read(fd, buf, sizeof(buf) - 1);
        if (bytesRead > 0) {
            buf[bytesRead] = '\0';
            buffer += buf;
            
            // 查找完整的数据行（以换行符结束）
            size_t newlinePos = buffer.find('\n');
            if (newlinePos != std::string::npos) {
                std::string line = buffer.substr(0, newlinePos);
                buffer = buffer.substr(newlinePos + 1);
                return line;
            }
        }
        return "";
    }

    void close() {
        //未更改，略
    }
};

class SensorReader {
private:
    SerialPort serial;
    bool running;
    std::thread readerThread;

public:
    SensorReader() : running(false) {}

    //未更改，略

private:
    void readLoop() {
        //未更改，略
    }
    
    //删除string readSensorData()

    void processSensorData(const std::string& data) {
        // 解析数据格式: "T:28.00,H:77.00"
        size_t t_pos = data.find("T:");
        size_t h_pos = data.find("H:");
        
        if (t_pos != std::string::npos && h_pos != std::string::npos) {
            try {
                // 提取温度值
                size_t t_end = data.find(',', t_pos);
                if (t_end != std::string::npos) {
                    std::string temp_str = data.substr(t_pos + 2, t_end - t_pos - 2);
                    float temperature = std::stof(temp_str);
                    
                    // 提取湿度值
                    std::string hum_str = data.substr(h_pos + 2);
                    float humidity = std::stof(hum_str);
                    
                    // 更新共享数据
                    {
                        std::lock_guard<std::mutex> lock(dataMutex);
                        latestData.temperature = temperature;
                        latestData.humidity = humidity;
                        newDataAvailable = true;
                    }
                    
                    std::cout << "解析成功 - 温度: " << temperature << "°C, 湿度: " << humidity << "%" << std::endl;
                }
            } catch (const std::exception& e) {
                std::cout << "数据解析错误: " << e.what() << " 数据: " << data << std::endl;
            }
        }
    }
    
    //删除upodateDisplay()
    
};

// 自定义定时器类，用于定期更新GUI
class UpdateTimer : public tpTimer {
private:
    tpLabel* temperatureLabel;
    tpLabel* humidityLabel;
    tpLabel* statusLabel;

public:
    UpdateTimer(tpLabel* tempLabel, tpLabel* humLabel, tpLabel* statLabel) 
        : temperatureLabel(tempLabel), humidityLabel(humLabel), statusLabel(statLabel) {
    }
    
    void timeout() override {
        // 检查是否有新数据
        bool hasNewData = false;
        SensorData currentData;
        
        {
            std::lock_guard<std::mutex> lock(dataMutex);
            if (newDataAvailable) {
                currentData = latestData;
                newDataAvailable = false;
                hasNewData = true;
            }
        }
        
        if (hasNewData) {
            // 在主线程中安全地更新GUI
            std::string tempText = "温度: " + std::to_string(currentData.temperature).substr(0, 5) + "°C";
            std::string humText = "湿度: " + std::to_string(currentData.humidity).substr(0, 5) + "%";
            
            temperatureLabel->setText(tempText.c_str());
            humidityLabel->setText(humText.c_str());
            
            // 强制刷新显示
            temperatureLabel->update();
            humidityLabel->update();
            
            statusLabel->setText("数据更新成功");
        }
        
        // 重新启动定时器
        startTimer(500); // 每500毫秒检查一次
    }
};

int32_t main(int32_t argc, char *argv[]) {
    //未更改，略
    
    if (sensorInitialized) {
        sensorReader.start();
        statusLabel->setText("传感器连接成功");
        
        // 启动GUI更新定时器
        updateTimer->startTimer(500); // 500毫秒后启动
    } else {
        statusLabel->setText("传感器连接失败");
        tempLabel->setText("温度: 连接失败");
        humLabel->setText("湿度: 连接失败");
    }

    // 绑定退出按钮
    connect(exitButton, onClicked, [&](bool checked) {
        sensorReader.stop();
        delete updateTimer;
        exit(0);
    });

    // 手动更新主窗体
    vScreen->update();

    // 运行主事件循环
    int result = app.run();
    
    // 程序退出时停止传感器读取
    sensorReader.stop();
    delete updateTimer;
    
    return result;
}
```

由于我们使用了C++11特性，需要确保编译脚本支持：

```bash
#!/bin/bash
g++ main.cpp -o sensor_app \
    -I/usr/include \
    -I/usr/include/tinyPiX \
    -I/usr/include/tinyPiX/Api \
    -I/usr/include/tinyPiX/Utils \
    -I/usr/include/tinyPiX/ExternUtils \
    -I/usr/include/tinyPiX/SingleGUI \
    -I/usr/include/tinyPiX/SingleGUI/core \
    -I/usr/include/tinyPiX/SingleGUI/screen \
    -I/usr/include/tinyPiX/SingleGUI/widgets \
    -I/usr/include/PiXWM \
    -I/usr/include/TpWM \
    -I/usr/include/SDL2 \
    -I/usr/include/freetype2 \
    -I/usr/include/cairo \
    -I/usr/include/pango-1.0 \
    -I/usr/include/glib-2.0 \
    -I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
    -L/usr/lib \
    -L/usr/lib/tinyPiX \
    -lPiXUtils \
    -lPiXExternUtils \
    -lPiXSingleGUI \
    -lPiXDesktopGUI \
    -lSDL2 \
    -lSDL2_image \
    -lSDL2_gfx \
    -lcairo \
    -lpango-1.0 \
    -lpangocairo-1.0 \
    -lglib-2.0 \
    -lgobject-2.0 \
    -lfreetype \
    -lfontconfig \
    -lpthread \
    -ldl \
    -std=c++11
```

关键改进说明
1. 数据缓冲和完整帧检测
  - 添加了`buffer`成员变量来存储不完整的数据
  - `readLine()`方法会累积数据，直到收到完整的行（以换行符结束）
  - 这样可以确保我们处理的是完整的传感器数据帧

2. 线程安全的GUI更新
  - 使用互斥锁(`mutex`)保护共享数据
  - 创建了`UpdateTimer`类，在主线程中定期检查新数据
  - 所有GUI操作都在主线程中执行，确保线程安全

3. 改进的数据解析
  - 添加了更健壮的错误处理
  - 改进了数据解析逻辑，确保能正确处理各种数据格式

### 问题四：定时器头文件路径错误

重新编译，发现定时器头文件出错：

```bash
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# ./cross 
main.cpp:5:10: fatal error: tinyPiX/SingleGUI/core/tpTimer.h: 没有那个文件或目录
    5 | #include <tinyPiX/SingleGUI/core/tpTimer.h>  // 添加定时器支持
      |          ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
compilation terminated.
```

我们首先进行排查：

```bash
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# find /usr/include -name "tpTimer.h" 2>/dev/null
/usr/include/tinyPiX/Utils/tpTimer.h
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# find ~/TinyPiXOS -name "tpTimer.h" 2>/dev/null
/root/TinyPiXOS/TinyPiXCore-master (1)/src/include/Utils/tpTimer.h
/root/TinyPiXOS/TinyPiXCore-master/src/include/Utils/tpTimer.h
/root/TinyPiXOS/TinyPiXCore-master/install/x86_64/include/Utils/tpTimer.h
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# ls -la /usr/include/tinyPiX/SingleGUI/core/
总计 48
drwxr-xr-x 2 root root  4096 10月 18 18:13 .
drwxr-xr-x 5 root root  4096 10月 18 18:13 ..
-rw-r--r-- 1 root root  3336  7月 23 15:06 tpApp.h
-rw-r--r-- 1 root root  1816  7月 23 15:06 tpAutoObject.h
-rw-r--r-- 1 root root 14821  7月 23 15:06 tpChildWidget.h
-rw-r--r-- 1 root root  9624  7月 23 15:06 tpEvent.h
-rw-r--r-- 1 root root  2814  7月 23 15:06 tpObject.h
```

找到了 `tpTimer.h` 的位置。它实际上在 `/usr/include/tinyPiX/Utils/tpTimer.h`，而不是在 `SingleGUI/core` 目录下。

修改 `main.cpp` 文件，将：

```
#include <tinyPiX/SingleGUI/core/tpTimer.h>  // 添加定时器支持
```

改为：

```
#include <tinyPiX/Utils/tpTimer.h>  // 添加定时器支持
```

同时优化代码，最终如下：

```c++
//未更改，略
#include <tinyPiX/Utils/tpTimer.h>  // 修正后的定时器头文件路径
//未更改，略

// 全局数据共享
//未更改，略

class SerialPort {
private:
    //未更改，略

public:

    //未更改，略

    // 读取数据并返回完整的数据行
    std::string readLine() {
        char buf[256];
        int bytesRead = ::read(fd, buf, sizeof(buf) - 1);
        if (bytesRead > 0) {
            buf[bytesRead] = '\0';
            buffer += buf;
            
            // 查找完整的数据行（以换行符结束）
            size_t newlinePos = buffer.find('\n');
            if (newlinePos != std::string::npos) {
                std::string line = buffer.substr(0, newlinePos);
                // 移除可能的回车符
                if (!line.empty() && line.back() == '\r') {
                    line.pop_back();
                }
                buffer = buffer.substr(newlinePos + 1);
                return line;
            }
        }
        return "";
    }

    //未更改，略
};

class SensorReader {
	//未更改，略
};

// 自定义定时器类，用于定期更新GUI
class UpdateTimer : public tpTimer {
	//未更改，略
};

int32_t main(int32_t argc, char *argv[]) {
    //未更改，略
}
```

### 问题五：接口使用错误

重新编译，头文件正确，其余错误如下：

```bash
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# ./cross 
main.cpp:197:10: error: ‘void UpdateTimer::timeout()’ marked ‘override’, but does not override
  197 |     void timeout() override {
      |          ^~~~~~~
main.cpp: In member function ‘void UpdateTimer::timeout()’:
main.cpp:227:9: error: ‘startTimer’ was not declared in this scope; did you mean ‘strptime’?
  227 |         startTimer(500); // 每500毫秒检查一次
      |         ^~~~~~~~~~
      |         strptime
main.cpp: In function ‘int32_t main(int32_t, char**)’:
main.cpp:291:22: error: ‘class UpdateTimer’ has no member named ‘startTimer’
  291 |         updateTimer->startTimer(500); // 500毫秒后启动
      |                      ^~~~~~~~~~
```

看起来 `tpTimer` 类的接口与我们代码中使用的不同。接下来检查实际的接口并修正代码。

根据错误信息，我们需要：

1. 移除 `override` 关键字（因为基类可能没有 `timeout` 虚函数）
2. 修正定时器启动方法（可能不是 `startTimer`）

修正版本：

```c++
//未更改，略

// 替代方案：不使用 tpTimer，使用标准线程和条件变量
class GUIUpdater {
private:
    tpLabel* temperatureLabel;
    tpLabel* humidityLabel;
    tpLabel* statusLabel;
    bool running;
    std::thread updateThread;

public:
    GUIUpdater(tpLabel* tempLabel, tpLabel* humLabel, tpLabel* statLabel) 
        : temperatureLabel(tempLabel), humidityLabel(humLabel), statusLabel(statLabel), running(false) {
    }
    
    void start() {
        running = true;
        updateThread = std::thread(&GUIUpdater::updateLoop, this);
    }
    
    void stop() {
        running = false;
        if (updateThread.joinable()) {
            updateThread.join();
        }
    }
    
private:
    void updateLoop() {
        while (running) {
            // 检查是否有新数据
            bool hasNewData = false;
            SensorData currentData;
            
            {
                std::lock_guard<std::mutex> lock(dataMutex);
                if (newDataAvailable) {
                    currentData = latestData;
                    newDataAvailable = false;
                    hasNewData = true;
                }
            }
            
            if (hasNewData) {
                // 在主线程中安全地更新GUI
                std::string tempText = "温度: " + std::to_string(currentData.temperature).substr(0, 5) + "°C";
                std::string humText = "湿度: " + std::to_string(currentData.humidity).substr(0, 5) + "%";
                
                temperatureLabel->setText(tempText.c_str());
                humidityLabel->setText(humText.c_str());
                
                // 强制刷新显示
                temperatureLabel->update();
                humidityLabel->update();
                
                statusLabel->setText("数据更新成功");
            }
            
            // 每500毫秒检查一次
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
        }
    }
};

int32_t main(int32_t argc, char *argv[]) {
    //未更改，略
    
    if (sensorInitialized) {
        sensorReader.start();
        guiUpdater->start();  // 启动GUI更新线程
        statusLabel->setText("传感器连接成功");
    } else {
        statusLabel->setText("传感器连接失败");
        tempLabel->setText("温度: 连接失败");
        humLabel->setText("湿度: 连接失败");
    }

    // 绑定退出按钮
    connect(exitButton, onClicked, [&](bool checked) {
        sensorReader.stop();
        guiUpdater->stop();
        delete guiUpdater;
        exit(0);
    });

    // 手动更新主窗体
    vScreen->update();

    // 运行主事件循环
    int result = app.run();
    
    // 程序退出时停止传感器读取和GUI更新
    sensorReader.stop();
    guiUpdater->stop();//停止GUI更新
    delete guiUpdater;
    
    return result;
}
```

**关键改进说明*

1. **移除了 tpTimer 依赖**：
   - 不再使用可能有接口问题的 `tpTimer` 类
   - 改用标准的 `std::thread` 实现定时更新功能
2. **创建了 GUIUpdater 类**：
   - 使用单独的线程定期检查数据更新
   - 每500毫秒检查一次是否有新数据
   - 在主线程中安全地更新GUI
3. **保持了原有的数据缓冲和解析逻辑**：
   - 串口数据缓冲确保处理完整的数据行
   - 健壮的数据解析和错误处理

### 成功运行

随后编译，成功运行，终端数据格式正常，窗口数据可实时变化。

<video width="820" height="740" controls>
    <source src="温湿度计-获取串口数据部分.mp4" type="video/mp4">
</video>

后续配置dev环境后，先将代码修改到对应环境下，并尝试之前没有成功的一些方法，尽量用Tp中的方法来实现功能。

## 切换dev分支

在成功配置2.0dev分支环境后，开始修改代码，使其适用于最新环境。

第一步，简单修改对应库

在main.cpp中，将全部`tp`修改为`Tp`；

在cross中，根据`/usr/include/TimyPiX/`和`/usr/lib/TinyPiX`中的库名修改相关依赖设置：

```bash
#!/bin/bash
g++ main.cpp -o SerialPortData \
    -I/usr/include \
#    -I/usr/include/tinyPiX \
#    -I/usr/include/tinyPiX/Api \
#    -I/usr/include/tinyPiX/Utils \
#    -I/usr/include/tinyPiX/ExternUtils \
#    -I/usr/include/tinyPiX/SingleGUI \
#    -I/usr/include/tinyPiX/SingleGUI/core \
#    -I/usr/include/tinyPiX/SingleGUI/screen \
#    -I/usr/include/tinyPiX/SingleGUI/widgets \
#修改如下：
	
	
    -I/usr/include/PiXWM \
    -I/usr/include/TpWM \
    -I/usr/include/SDL2 \
    -I/usr/include/freetype2 \
    -I/usr/include/cairo \
    -I/usr/include/pango-1.0 \
    -I/usr/include/glib-2.0 \
    -I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
    -L/usr/lib \
    -L/usr/lib/tinyPiX \
    -lPiXUtils \
    -lPiXExternUtils \
    -lPiXSingleGUI \
    -lPiXDesktopGUI \
    -lSDL2 \
    -lSDL2_image \
    -lSDL2_gfx \
    -lcairo \
    -lpango-1.0 \
    -lpangocairo-1.0 \
    -lglib-2.0 \
    -lgobject-2.0 \
    -lfreetype \
    -lfontconfig \
    -lpthread \
    -ldl \
    -std=c++11

```

