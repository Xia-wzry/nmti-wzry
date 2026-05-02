# NMTI · 王者农民人格测试

一个基于王者荣耀梗文化的人格测试小程序，15 道题，5 维度打分，25 种人格。

## 线上体验

- Cloudflare: https://nmti-wzry.pages.dev
- CloudBase（备用）: https://ai-native-d8ga6bjzwd88e7eeb-1424829144.tcloudbaseapp.com/

## 技术栈

- 纯静态 HTML/JS/CSS（无构建）
- html2canvas 结果页生成长图
- qrcode-generator 本地二维码
- 后端：腾讯云 CloudBase HTTP 触发器（数据上报/查询）

## 文件结构

- `index.html` — 测试主入口
- `questions.js` — 15 题题库
- `logic.js` — 人格判定逻辑
- `personas.js` — 25 人格数据
- `preview.html` — 开发预览
- `gallery.html` — 人格图总览
- `admin.html` — 数据后台
- `personas/*.png` — 人格插画
- `audio/*.mp3` — 题目音频

## 作者

小红书 @白灼兔子狗
