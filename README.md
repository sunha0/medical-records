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
- **数据存储**: JSON 文件本地存储（按用户独立文件）
- **密码加密**: SHA256 哈希
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
│   │   └── storage.js     # 文件存储读写（用户、记录、指标、用药）
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
└── data/
    ├── users.json         # 用户数据
    └── <userId>/          # 每个用户的独立数据目录
        ├── records.json
        ├── metrics.json
        └── medications.json
```

## 使用说明

1. 首次使用需注册账号
2. 登录后可在侧边栏切换各功能模块
3. 在"家庭成员"中添加成员后在记录中关联对应成员
4. 在"健康指标"中记录体征数据，自动生成趋势图
5. 在"用药管理"中添加药品并设置服药时间
6. 在"日历"中查看有记录的日期，点击查看详情
7. 在"健康趋势"中查看统计图表，支持导出 PDF

## 注意事项

- 图片以 Base64 格式存储在 JSON 文件中
- 请定期备份 data 目录下的数据文件
- 默认端口 3000，如需修改请编辑 server.js
- 首次启动会自动创建所需目录和文件

## License

MIT
