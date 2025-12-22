# 配置TinyPiX环境过程中遇到的问题

## TinyPiXCore

### master分支

在core中cmake，随后make至2%时，遇到问题，主要内容如下：

```bash
PiXUtils/CMakeFiles/PiXUtils.dir/__/src/src/Utils/tpRect.cpp.o
/root/TinyPiXOS/TinyPiXCore-master/src/src/Utils/tpRect.cpp: In member function ‘virtual void tpRect::get(ItpRect*) const’:
/root/TinyPiXOS/TinyPiXCore-master/src/src/Utils/tpRect.cpp:403:41: error: invalid conversion from ‘tpUInt32*’ {aka ‘unsigned int*’} to ‘int32_t*’ {aka ‘int*’} [-fpermissive]
  403 |                 this->get(&r->x, &r->y, &r->w, &r->h);
      |                                         ^~~~~
      |                                         |
      |                                         tpUInt32* {aka unsigned int*}
/root/TinyPiXOS/TinyPiXCore-master/src/src/Utils/tpRect.cpp:361:51: note:   initializing argument 3 of ‘virtual void tpRect::get(int32_t*, int32_t*, int32_t*, int32_t*) const’
  361 | void tpRect::get(int32_t *x, int32_t *y, int32_t *w, int32_t *h) const
      |                                          ~~~~~~~~~^
/root/TinyPiXOS/TinyPiXCore-master/src/src/Utils/tpRect.cpp:403:48: error: invalid conversion from ‘tpUInt32*’ {aka ‘unsigned int*’} to ‘int32_t*’ {aka ‘int*’} [-fpermissive]
  403 |                 this->get(&r->x, &r->y, &r->w, &r->h);
      |                                                ^~~~~
      |                                                |
      |                                                tpUInt32* {aka unsigned int*}
/root/TinyPiXOS/TinyPiXCore-master/src/src/Utils/tpRect.cpp:361:63: note:   initializing argument 4 of ‘virtual void tpRect::get(int32_t*, int32_t*, int32_t*, int32_t*) const’
  361 | void tpRect::get(int32_t *x, int32_t *y, int32_t *w, int32_t *h) const
      |                                                      ~~~~~~~~~^
```

问题分析：

这个错误是由于 `tpRect.cpp` 中的类型不匹配导致的：

- `ItpRect` 结构体中的 `w` 和 `h` 成员是 `tpUInt32*`（无符号整型指针）
- 但 `tpRect::get` 函数期望 `int32_t*`（有符号整型指针）

解决方案：

手动编辑 `src/src/Utils/tpRect.cpp` 第403行：

```cpp
// 将这一行：
this->get(&r->x, &r->y, &r->w, &r->h);

// 修改为：
this->get(&r->x, &r->y, 
          reinterpret_cast<int32_t*>(&r->w), 
          reinterpret_cast<int32_t*>(&r->h));
```

然后重新make，成功继续运行。

修改如下：

![1760780982821](./image/修改.png)

后续因突发事件，时间紧张，没有截图，为事后根据终端和代码中的记录整理得出。

make至75%时出现报错，关键内容如下：

```bash
/root/TinyPiXOS/TinyPiXCore-master/src/src/SingleGUI/screen/tpScreen.cpp: In constructor ‘tpScreen::tpScreen(const char*, int32_t, int32_t, uint32_t, uint32_t)’:
/root/TinyPiXOS/TinyPiXCore-master/src/src/SingleGUI/screen/tpScreen.cpp:625:51: error: invalid conversion from ‘int32_t (*)(int32_t, int32_t, int32_t, int32_t, int32_t, uint8_t, int32_t, void*)’ {aka ‘int (*)(int, int, int, int, int, unsigned char, int, void*)’} to ‘AssignAppChange’ {aka ‘int (*)(int, int, int, int, int, int, unsigned char, int, void*)’} [-fpermissive]
  625 |                 tinyPiX_wf_app_assign(set->agent, transferAppState);
      |                                                   ^~~~~~~~~~~~~~~~
      |                                                   |
      |                                                   int32_t (*)(int32_t, int32_t, int32_t, int32_t, int32_t, uint8_t, int32_t, void*) {aka int (*)(int, int, int, int, int, unsigned char, int, void*)}
In file included from /root/TinyPiXOS/TinyPiXCore-master/PiXSingleGUI/../src/include_p/SingleGUI/tpDef.h:13,
                 from /root/TinyPiXOS/TinyPiXCore-master/src/src/SingleGUI/screen/tpScreen.cpp:4:
/usr/include/PiXWM/tinyPiXWF.h:135:89: note:   initializing argument 2 of ‘int tinyPiX_wf_app_assign(IPiWFApiAgent*, AssignAppChange)’
  135 | tinyPiX_wf_app_assign(IPiWFApiAgent *agent, AssignAppChange assignAppCallBack);//only for wm win
      |                                             ~~~~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~
```

这是之前解决过的函数签名不匹配的问题。

问题分析：

- 提供的函数：`int32_t (*)(int32_t, int32_t, int32_t, int32_t, int32_t, uint8_t, int32_t, void*)` - **8个参数**
- 期望的函数：`int (*)(int, int, int, int, int, int, unsigned char, int, void*)` - **9个参数**

解决方案：

不修改函数实现，仅在调用处添加强制类型转换：

在 `tpScreen.cpp` 第625行附近，修改为：

```c++
// 原代码：
tinyPiX_wf_app_assign(set->agent, transferAppState);

// 修改为：
tinyPiX_wf_app_assign(set->agent, (AssignAppChange)transferAppState);
```

随后会再次出现另外的函数签名问题：

```bash
/root/TinyPiXOS/TinyPiXCore-master/src/src/SingleGUI/screen/tpFixScreen.cpp: In member function ‘virtual int32_t tpFixScreen::setVScreenAttribute(uint8_t, uint32_t, int32_t)’:
/root/TinyPiXOS/TinyPiXCore-master/src/src/SingleGUI/screen/tpFixScreen.cpp:132:49: error: too few arguments to function ‘int tinyPiX_wf_send_app_state(IPiWFApiAgent*, int, int, int, int, int, unsigned char, int)’
  132 |                 return tinyPiX_wf_send_app_state(set->agent, TP_INVALIDATE_VALUE, this->visible(), this->objectActive(), color, alpha, screenAttr);
      |                        ~~~~~~~~~~~~~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
In file included from /root/TinyPiXOS/TinyPiXCore-master/PiXSingleGUI/../src/include_p/SingleGUI/tpDef.h:13,
                 from /root/TinyPiXOS/TinyPiXCore-master/src/src/SingleGUI/screen/tpFixScreen.cpp:27:
/usr/include/PiXWM/tinyPiXWF.h:107:29: note: declared here
  107 | extern DECLSPEC int STDCALL tinyPiX_wf_send_app_state(IPiWFApiAgent *agents,int did, int rotate,
      |                             ^~~~~~~~~~~~~~~~~~~~~~~~~
```

这次是 `tinyPiX_wf_send_app_state` 函数，它需要8个参数，但代码中只提供了7个参数。

问题分析：

根据头文件声明，函数需要以下参数：

```c++
tinyPiX_wf_send_app_state(IPiWFApiAgent *agents, int did, int rotate, int visible, int active, int color, unsigned char alpha, int screenAttr)
```

解决方案：

当前代码：

```c++
return tinyPiX_wf_send_app_state(set->agent, TP_INVALIDATE_VALUE, this->visible(), this->objectActive(), color, alpha, screenAttr);
```

需要修改为（添加一个rotate参数）：

```c++
return tinyPiX_wf_send_app_state(set->agent, TP_INVALIDATE_VALUE, 0, this->visible(), this->objectActive(), color, alpha, screenAttr);
```

修改后make成功，随后创建文件夹 `SerialPortData`，在该目录下，首先进行基础教程示例代码开发测试：

遇到第一个问题：

```bash
main.cpp:1:10: fatal error: tpApp.h: 没有那个文件或目录
    1 | #include "tpApp.h"
      |          ^~~~~~~~~
compilation terminated.
```

错误信息显示找不到 `tpApp.h` 头文件。根据TinyPiXOS的实际安装情况，可能有以下几种原因：

1. **头文件名称大小写问题**
2. **头文件路径不正确**
3. **头文件未正确安装**

首先进行排查：

```bash
# find /usr/include -name "*pp.h" 2>/dev/null | grep -i app
/usr/include/linux/smiapp.h
/usr/include/tinyPiX/SingleGUI/core/tpApp.h
```

先对cross编译脚本进行修改：

```bash
#!/bin/bash
g++ main.cpp -o button \
    -I/usr/include/tinyPiX \
    -I/usr/include \
    -L/usr/lib/tinyPiX \
    -lPiXUtils \
    -lPiXExternUtils \
    -lPiXSingleGUI \
    -lSDL2 \
    -lSDL2_image \
    -lSDL2_gfx \
    -lpthread
```

重新运行编译脚本：

```bash
# ./cross 
In file included from /usr/include/tinyPiX/SingleGUI/core/tpApp.h:5,
                 from main.cpp:1:
/usr/include/tinyPiX/Utils/tpUtils.h:7:10: fatal error: typesDef.h: 没有那个文件或目录
    7 | #include "typesDef.h"
      |          ^~~~~~~~~~~~
compilation terminated.
```

显然，这次遇到了嵌套依赖的问题。`tpApp.h` 包含了 `tpUtils.h`，而 `tpUtils.h` 又需要 `typesDef.h`。继续解决这个依赖问题。

先进行排查，尝试找到该头文件：

```bash
root@ly-virtual-machine:~/TinyPiXOS/TinyPiXCore-master/SerialPortData# find /usr/include -name "typesDef.h" 2>/dev/null
/usr/include/TpWM/typesDef.h
/usr/include/PiXWM/typesDef.h
```

更新编译脚本，以包含对应路径：

```bash
#!/bin/bash
g++ main.cpp -o button \
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
    -ldl
```

重新编译正常，根据前面的情况，我先将示例代码中的 `Tp`都换成 `tp`，随后成功编译得到运行程序,并成功在窗口中运行。

后续更新分享App的配置情况，然后是各自dev分支下的情况。

### dev分支

cmake、make、make install时非常顺利，毫无问题，不再赘述。

## TinyPiXApp

### master分支

### dev分支
