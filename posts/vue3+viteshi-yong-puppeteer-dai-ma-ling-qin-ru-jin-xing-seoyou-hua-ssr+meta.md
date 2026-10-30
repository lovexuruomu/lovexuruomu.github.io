<!--
.. title: Vue3+Vite使用 Puppeteer 代码零侵入进行SEO优化（SSR+Meta）
.. slug: vue3+viteshi-yong-puppeteer-dai-ma-ling-qin-ru-jin-xing-seoyou-hua-ssr+meta
.. date: 2026-10-30 14:30:56 UTC+08:00
.. tags: 
.. category: 
.. link: 
.. description: 
.. type: text
-->

## 1. 背景

[【蓿岩竹清,已下线】](https://xuyanzhuqing.top/)个人博客在 2025 年 3 月完成了新一轮的全面迭代升级 —— 尽管日均流量寥寥无几，我依然乐此不疲地进行优化调整。本文将系统分享基于 Vue 多页面应用（SPA）的搜索引擎优化（SEO）完整解决方案，涵盖从路由配置到元数据管理的全流程实践经验，原理是可行的，请读者放心。

灵感来源：<https://blog.csdn.net/qq_34988304/article/details/135835945>

## 2. SSR 技术选型

现代 SSR 方案已高度框架化，应该优先选择生态成熟的方案（Next.js/Nuxt.js）。对于 Vue3 项目，Nuxt.js 提供了开箱即用的 SSR+SEO 解决方案，兼顾开发效率与性能，尤其适合内容型博客的场景。若需极致轻量化，这里采用nodejs 与 Puppeteer 原生实现实在是不想去大改现有逻辑。

### 2.1 ssr 方案对比

| 方案                | 生态      | 学习成本 | 性能    | 适用项目规模         | 典型案例                 |
| ----------------- | ------- | ---- | ----- | -------------- | -------------------- |
| Next.js           | React   | 中    | ★★★★☆ | 中大型应用          | Twitter、Netflix Docs |
| Nuxt.js           | Vue     | 低    | ★★★★  | 中小型应用          | 个人博客、企业官网            |
| SvelteKit         | Svelte  | 低    | ★★★★☆ | 轻量应用           | Svelte 官网            |
| Angular Universal | Angular | 高    | ★★★☆  | 企业级 Angular 项目 | Google Ads           |
| Astro             | 多框架     | 中    | ★★★★★ | 内容型网站          | Vue.js 官网（部分）        |
| puppeteer         | 多框架     | 中    | ★★★☆  | 中小型应用          | 蓿岩竹清博客               |

由于不想大改，所以我选择 [puppeteer](https://pptr.nodejs.cn/guides/page-interactions)

### 2.2 puppeteer 应用场景

| 场景           | 技术实现                                               | 案例                       |
| ------------ | -------------------------------------------------- | ------------------------ |
| **SEO 预渲染**  | 监听爬虫 UA，动态返回 Puppeteer 渲染的 HTML（如 prerender.io 方案） | Vue/React SPA 博客的搜索引擎友好化 |
| **自动化测试**    | 模拟用户登录、表单提交，集成 CI/CD（如 GitHub Actions）             | 电商支付流程测试                 |
| **数据抓取**     | 处理反爬机制（如 JS 渲染、Cookies），提取结构化数据                    | 房价监控、竞品价格跟踪              |
| **报告生成**     | 批量生成带样式的 PDF / 图片（结合模板引擎）                          | 周报自动生成（含图表、数据表格）         |
| **浏览器兼容性测试** | 模拟不同设备 / 浏览器环境（如移动端、旧版 Chrome）                     | 前端组件跨设备渲染验证              |

### 2.3 我的方案

*   vue：^3.4.21
*   vite：^5.1.5
*   vue-meta：3.0.0-alpha.10
*   puppeteer：^24.4.0

## 3. SEO 实现 Meta 设置

安装依赖

```bash
pnpm add vue-meta@3.0.0-alpha.10
```

main.js 中引入 vue-meta

```ts
import '@/assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import { createMetaManager} from 'vue-meta'
import App from './App.vue'

const app = createApp(App)
/** 注意看！！就是这里*/
app.use(createMetaManager(false, {
  meta: { tag: 'meta', nameless: true }
}))

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

app.use(router)

app.mount('#app')


```

App.vue 中

```html
<template>
  <!- 必须写 ->
  <metainfo />
  <RouterView />
</template>

<script setup lang="tsx">
import { RouterView } from "vue-router";
</script>

```

首页中加入

```html
<script setup lang="tsx">
onMounted(() => {
  getData()
  useMeta({
    title: '蓿岩竹清 - 程序视界',
    meta: [
      { name: 'keywords', content: '蓿岩竹清,javascript,nodejs,java,全干工程师' },
      { name: 'description', content: '欢迎来到蓿岩竹清，这里记录着我的思考、见闻和一些有趣的分享。希望每一篇文字都能为你带来启发或共鸣。无论你是偶然路过还是常客，都感谢你的停留。期待与你分享更多精彩内容，也欢迎常来坐坐，留下你的足迹！ 🌟'}
    ]
  });
})
</script>
```

渲染后的效果

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/1951f074a61542d0aa6b4cef7340a2ec~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1793946626&x-orig-sign=gw2M8zsolKkmtIC387HWir4a2co%3D)

## 4. 后台 Puppeteer 部分

### 4.1 准备工作

```bash
# 安装 pm2用来持久化运行 server 程序
npm install pm2 -g

# 初始化文件夹及目录
mkdir spider
cd spider
touch index.js
touch puppeteer-pool.js
touch server.js

# 新增依赖
npm init -y
pnpm add puppeteer@^24.4.0
pnpm add express@~4.16.1
pnpm add html-minifier
```

### 4.2 编写代码

/index.js

```js
const puppeteer = require('puppeteer');
const puppeteerPools = require('./puppeteer-pool');

const spider = async (url) => {
  let index = Math.floor(Math.random() * puppeteerPools.length);
	//随机获取浏览器
	let browserWSEndpoint = puppeteerPools[index];
	console.info('使用的浏览器：' + browserWSEndpoint)
	//连接
	const browser = await puppeteer.connect({
		browserWSEndpoint
	});

  const page = await browser.newPage();

  // Navigate the page to a URL
  await page.goto(url);

  // Set screen size
  // await page.setViewport({width: 1080, height: 1024});

  const html = await page.waitForSelector(
    'html',
  );

  const htmlOuterHTML = await html?.evaluate(el => el.outerHTML);

  await page.close();
  // 与 browser.close() 不同，browser.disconnect() 不会关闭浏览器或关闭任何页面。
  browser.disconnect();
  return htmlOuterHTML
}

module.exports = spider
```

/server.js

```js
const express = require('express');
var app = express();
var spider = require("./index.js");
var minify = require('html-minifier').minify;

app.get('*', async (req, res) => {
	const path = req.originalUrl === '/' ? '' : req.originalUrl
	let url = "https://xuyanzhuqing.top" + path;
	console.log('请求的完整URL：' + url);
	let content = await spider(url).catch((error) => {
		console.log(error);
		res.send('获取html内容失败');
		return;
	});
	// 通过minify库压缩代码
  content=minify(content,{removeComments: true,collapseWhitespace: true,minifyJS:true, minifyCSS:true});
	res.send(content);
});

const server = app.listen(4000, () => {
	console.log('服务已启动！');
});

const closeHandler = () => {
	console.log('Server closed.');
}

// 监听 SIGINT 信号（Ctrl + C）
process.on('SIGINT', () => {
	console.log('Received SIGINT signal. Closing server...');
	// 关闭服务器
	server.close(closeHandler);
});

// 监听 SIGTERM 信号
process.on('SIGTERM', () => {
	console.log('Received SIGTERM signal. Closing server...');
	server.close(closeHandler);
});
```

/puppeteer-pool.js

```js
const puppeteer = require('puppeteer')

const MAX_BROWSER = 2
const browserPools = []

// 采用池的形式限制浏览器数量
const main = async () => {
  for (let i = 0; i < MAX_BROWSER; i++) {
    const browser = await puppeteer.launch({
      headless: 'shell',
      //参数
			args: [
				'--disable-gpu',
				'--disable-dev-shm-usage',
				'--disable-setuid-sandbox',
				'--no-first-run',
				'--no-sandbox',
				'--no-zygote',
				'--single-process' // 屌丝模式，不开启多进程
			],
      //一般不需要配置这条，除非启动一直报错找不到谷歌浏览器
			//executablePath:'chrome.exe在你本机上的路径，例如C:/Program Files/Google/chrome.exe'
			// executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    })
    const endPoint = await browser.wsEndpoint()
    browserPools.push(endPoint)
  }
}

main()

module.exports = browserPools
```

### 4.3 安装 ubuntu 依赖

采用豆包AI 搜索的提示词： puppeteer/chrome 运行在 ubuntu 需要哪些依赖
<https://www.doubao.com/thread/wf97363a60a275548>

### 4.4 启动服务

```bash
node server.js

# 如果要长期在服务器运行
pm2 start "node server.js"
```

```bash
# 查看 pm2 任务 id
pm2 list

# 停止删除
pm2 stop/delete name_or_id

```

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/7cd0fdf4dd74433b986b048f4a9fe439~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1793946626&x-orig-sign=UmE4quCXRV5gYeMMBhqxy3qk1qc%3D)
启动之后执行在 log 中看到 【**服务已启动！**】说明服务启动成功

使用 pm2 执行时,执行一下命令查看 log

    pm2 log

### 4.5 nginx 代理

```nginx
location / {

    proxy_set_header  Host            $host:$proxy_port;
    proxy_set_header  X-Real-IP       $remote_addr;
    proxy_set_header  X-Forwarded-For $proxy_add_x_forwarded_for;

    if ($http_user_agent ~* "Baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator|bingbot|Sosospider|Sogou Pic Spider|Googlebot|360Spider") {
      proxy_pass  http://172.17.0.1:4000;
    }

    alias /usr/share/nginx/html/;
    index  index.html index.htm;
    try_files $uri $uri/ /index.html;
}
```

改完配置之后，测试 nginx 配置是否正确

```nginx
nginx -t
nginx -s reload
```

至此，我们实现了正常用户的访问，以及爬虫程序访问的全部工作

### 4.6 测试爬虫

百度爬虫请求头

User-Agent:Mozilla/5.0 (compatible; Baiduspider/2.0; +<http://www.baidu.com/search/spider.html>)

本地调试

```bash
## Request Duplicate
curl "http://localhost:4000/" \
     -H 'User-Agent: Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html'
```

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/269a5354fdb74c32b7367332aa80c4c2~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1793946626&x-orig-sign=084avHAFnJQf7EROoXwn45UWuA4%3D)

不使用爬虫

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/9c11a2f222d74de583b971d0eb371f62~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1793946626&x-orig-sign=UNgaQSnkCP2HVIn%2BHRhIL2Ink1E%3D)

可以看到不使用爬虫时，#app 中没有 dom 渲染，远端调试将 localhost:4000 换成你自己的域名即可

## 总结

1.  前端 vue-router 必须是 history 模式，注意避坑。
2.  测试的时候一定要仔细耐心，设计多个模块的调试，比较费神。

