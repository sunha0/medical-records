# 医程 - 医疗记录管理系统

一个简洁美观的医疗记录管理应用，帮助您安全地存储和查看就医历史。

## 功能特点

- **就医记录管理** - 添加、编辑、删除就医记录，包含患者姓名、医院、科室、诊断结果等
- **图片上传** - 支持上传处方单、检查报告、病历本等图片，最多9张
- **照片库** - 按标签分类管理所有检查图片
- **健康趋势** - 可视化展示就医频次、科室分布、医疗支出等统计数据
- **用户认证** - 注册登录功能，保护隐私数据
- **本地存储** - 数据存储在本地服务器，换浏览器也不会丢失

## 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Node.js + Express
- **数据存储**: JSON 文件本地存储
- **密码加密**: SHA256 哈希

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
├── server.js          # Express 服务端
├── package.json       # 项目配置
├── index.html         # 主页面
├── css/
│   └── styles.css     # 样式文件
├── js/
│   └── app.js         # 前端逻辑
└── data/
    ├── users.json     # 用户数据
    └── records.json   # 就医记录
```

## 截图

![医程](screenshot.png)

## 使用说明

1. 首次使用需注册账号
2. 登录后点击"添加记录"新增就医信息
3. 可上传检查报告等图片附件
4. 在"健康趋势"中查看统计图表
5. 通过"设置"修改密码

## 注意事项

- 图片以 Base64 格式存储在 JSON 文件中
- 请定期备份 data 目录下的数据文件
- 默认端口 3000，如需修改请编辑 server.js

## License

MIT
