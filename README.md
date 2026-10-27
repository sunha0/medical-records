# 健康记 - 全家健康管理平台

一个功能全面的家庭健康记录管理应用，帮助您安全地存储和查看就医历史，追踪健康指标，管理用药提醒。
<img width="1920" height="911" alt="image" src="https://github.com/user-attachments/assets/664e96a6-1350-4c35-85ea-120f9c7cc62b" />

## 功能特点

### 核心功能
- **就医记录管理** - 添加、编辑、删除就医记录，包含患者姓名、医院、科室、诊断结果等
- **图片上传** - 支持上传处方单、检查报告、病历本等图片，最多9张
- **照片库** - 按标签分类管理所有检查图片
- **健康趋势** - 可视化展示就医频次、科室分布、医疗支出等统计数据
- **家庭成员管理** - 支持多成员数据隔离，可切换不同成员查看对应记录

### 新增功能
- **健康指标追踪** - 记录血压、血糖、体重、心率等指标，配合 Chart.js 折线趋势图直观展示变化
- **用药管理** - 药品增删改查，设置用药频次和时段，支持启用/停用切换
- **日历视图** - 月历网格展示，有就医记录或提醒的日期自动标记圆点，点击查看详情
- **PDF 报告导出** - 一键导出就医记录和统计图表为 PDF 文件
- **PWA 支持** - 可安装到桌面，支持离线缓存静态资源

## 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript + Chart.js
- **后端**: Node.js + Express
- **数据存储**: 私有 Vercel Blob（JSON 文档与图片）
- **密码加密**: bcryptjs 哈希
- **PWA**: Service Worker + Manifest

## 安装运行

```bash
# 克隆项目
git clone <repository-url>
cd medical-records

# 安装依赖
npm install

# 启动服务
npm start
```

服务启动后访问: http://localhost:3000

## 项目结构

```
medical-records/
├── server.js              # Express 服务端入口
├── package.json           # 项目配置
├── index.html             # 主页面（含所有视图模板）
├── manifest.json          # PWA 配置
├── sw.js                  # Service Worker
├── css/
│   └── styles.css         # 样式文件
├── js/
│   └── app.js             # 前端逻辑（SPA 路由、API 交互、图表）
├── src/
│   ├── helpers/
│   │   └── storage.js     # Vercel Blob JSON 与图片读写
│   └── routes/
│       ├── auth.js        # 注册/登录
│       ├── records.js     # 就医记录 CRUD
│       ├── family.js      # 家庭成员管理
│       ├── upload.js      # 图片上传
│       ├── stats.js       # 统计图表数据
│       ├── reminders.js   # 提醒管理
│       ├── metrics.js     # 健康指标 CRUD
│       ├── medications.js # 用药管理 CRUD
│       └── admin.js       # 管理员接口
└── data/                  # 旧 JSON 数据，仅用于首次迁移到 Blob
    ├── users.json
    └── <userId>/          # 每个用户的旧数据目录
        ├── records.json
        ├── metrics.json
        └── medications.json
```

## Vercel 部署与持久化存储

1. 在 Vercel 创建一个 **Private Blob Store**，并连接到此项目。私有存储用于保护病历和图片；连接后 Vercel 会提供 Blob 访问凭据。
2. 在 Vercel 项目环境变量中设置稳定的 `JWT_SECRET`。若要保留当前登录令牌，请将现有签名密钥配置为该变量；更换密钥会使用户重新登录。不要把密钥提交到仓库。
3. 使用 Node.js 20.x 部署。Blob SDK 通过 Vercel OIDC 访问已连接的存储。
4. 本地开发时先链接 Vercel 项目，再运行 `vercel env pull .env.local` 获取环境变量；`.env.local` 已加入忽略规则。

首次启动时，如果 Blob 中还没有 `data/users.json`，应用会把部署包内现有 `data/` 下的用户、记录、指标、用药和关联图片导入私有 Blob。之后 Blob 是唯一持久化数据源，后续部署不会覆盖它。图片只允许所属账号通过带登录令牌的接口读取。

## 使用说明

1. 首次使用需注册账号
2. 登录后可在侧边栏切换各功能模块
3. 在"家庭成员"中添加成员后在记录中关联对应成员
4. 在"健康指标"中记录体征数据，自动生成趋势图
5. 在"用药管理"中添加药品并设置服药时间
6. 在"日历"中查看有记录的日期，点击查看详情
7. 在"健康趋势"中查看统计图表，支持导出 PDF

## 注意事项

- 用户、病历、指标和用药以 JSON 文档存储在私有 Vercel Blob；上传图片单独保存为私有 Blob。
- 旧 `data/` 目录仅用于首次导入；请在 Vercel Blob 中定期备份数据。
- 生产环境必须设置稳定的 `JWT_SECRET`；本地开发可通过 `vercel env pull .env.local` 同步环境变量。
- 默认端口 3000，如需修改请编辑 server.js。

## License

MIT
