# ROS2 Log Visualizer

这是一个基于 Web 的 ROS2 日志可视化工具，包含前端（Svelte + Vite）和后端（Node.js + Hono）组成的工作区项目。

## 环境要求

- Node.js (v22 或以上)
- pnpm (包管理器)

## 构建与运行

### 1. 安装依赖

在项目根目录下运行：

```bash
pnpm install
```

### 2. 开发模式

如果你想在开发过程中实时预览更改并启动服务，可以运行：

```bash
pnpm run dev
```

该命令会同时以开发模式启动前端页面和后端服务。

### 3. 构建打包

如需用于生产环境，请先执行构建：

```bash
pnpm run build
```

这将会把前端项目打包好。

### 4. 运行服务

完成构建后，运行以下命令启动服务：

```bash
pnpm run start
```