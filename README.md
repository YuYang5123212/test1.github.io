# 刘杨的测试网页 - 文件上传与管理

[![Build Status](https://travis-ci.org/yourusername/projectname.svg?branch=master)](https://travis-ci.org/yourusername/projectname)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概述

这是一个简单的Web应用，允许用户上传多个文件至服务器，并在页面上以蓝色链接的形式显示。上传的文件链接在页面刷新后仍可保留，并提供删除功能。

## 功能

- **文件上传**：用户可以一次上传多个文件。
- **文件列表**：显示所有已上传的文件，每个文件名都是一个可点击的蓝色链接，可以直接下载。
- **持久化存储**：文件信息在刷新页面后不会丢失，保证了文件链接的持续可用性。
- **删除文件**：用户可以删除任意上传的文件，通过点击文件旁边的删除按钮。

## 技术栈

- **前端**：HTML, CSS, JavaScript
- **后端**：Python with Flask
- **数据库**：文件系统存储 (可扩展至数据库存储 for more advanced features)

## 安装与运行

### 环境准备

确保你有Python和pip安装在你的系统上。

### 克隆仓库

```bash
git clone https://github.com/yourusername/projectname.git
cd projectname
