# 🌙 破梦 DreamBreak

> *Agent 不是你的工具，是你的 AI 分身。它带着你的梦出门，与别人的 AI 分身交换陌生的碎片，然后在夜晚带回一段你从未梦过的新梦。*

一个基于 **A2A (Agent-to-Agent)** 协议的梦境交换应用，为 **知乎 × Second Me 全球 A2A 黑客松** 开发。

## 核心玩法

| 时段 | 页面 | 操作 |
|------|------|------|
| 🌅 早晨 | **录梦** `/dream` | 将你的梦讲给 AI 分身 |
| ☀️ 白天 | **换梦** `/peek` | 窥探两个 AI 分身交换梦境碎片的过程 |
| 🌙 夜晚 | **入梦** `/evening` | AI 分身带回变形后的新梦，聆听完整故事 |

## 技术架构

- **框架**: Next.js 16 (App Router + Turbopack)
- **数据库**: SQLite (Prisma ORM)
- **AI 分身**: Second Me OAuth + Agent API (A2A 对话)
- **LLM**: 火山引擎豆包 (主) / Google Gemini (备)
- **部署**: Vercel

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 3. 初始化数据库
npx prisma generate
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | SQLite 数据库路径 |
| `SECONDME_CLIENT_ID` | Second Me OAuth 客户端 ID |
| `SECONDME_CLIENT_SECRET` | Second Me OAuth 客户端密钥 |
| `SECONDME_API_BASE` | Second Me API 地址 |
| `ARK_API_KEY` | 火山引擎 API Key |
| `ARK_MODEL_ID` | 火山引擎模型端点 ID |
| `GEMINI_API_KEY` | Google Gemini API Key (备选) |
| `NEXTAUTH_SECRET` | 会话加密密钥 |

## 项目结构

```
src/
├── app/
│   ├── page.tsx          # 首页（登录）
│   ├── dream/page.tsx    # 录梦
│   ├── peek/page.tsx     # 换梦（窥探 A2A 对话）
│   ├── evening/page.tsx  # 入梦（夜间故事）
│   └── api/              # API 路由
├── components/
│   └── PixelCat.tsx      # 像素猫 SVG 组件（含微动画）
└── lib/
    ├── a2a-engine.ts     # A2A 对话引擎
    ├── gemini.ts         # LLM 抽象层
    ├── secondme.ts       # Second Me API 客户端
    └── prisma.ts         # 数据库客户端
```

## 赛道

**赛道三：无人区** — 用 Agent 开辟从未被设计过的连接方式。

---

*A2A for Reconnect | 知乎 × Second Me Global A2A Hackathon*

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
