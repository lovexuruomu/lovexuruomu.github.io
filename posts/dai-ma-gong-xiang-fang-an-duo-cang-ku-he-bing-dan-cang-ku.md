<!--
.. title: 代码共享方案-多仓库合并单仓库
.. slug: dai-ma-gong-xiang-fang-an-duo-cang-ku-he-bing-dan-cang-ku
.. date: 2026-11-16 17:15:51 UTC+08:00
.. tags: 
.. category: 
.. link: 
.. description: 
.. type: text
-->

### 背景

公司从 2019 年立项以来，陆续分别开了若干个工程，这里代称为 apple, peach, banana, 以及 infra 工程，每个工程对应公司的一块业务，大体都是不相似的，其中 infra 的工程用于工程间代码共享，其中也有工程依赖于另外的工程，现需要将以上工程中部分功能挪到另一个新开的工程 dashboard。如何将多个仓库融合在一个仓库中，并保留原有历史记录，并且随着业务的演进，能够实时同步代码，且工程大多开发了5年以上，代码量巨大，如何组织代码，本文就是为这一方案而生。

原有工程结构如下：

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/7d868b6dd23846ea990a44edbd0e954a~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1795425336&x-orig-sign=zpxPRyX1VXBSrbuPn30JVOsRfOs%3D)

每个工程都是一个独立的 git 仓库，每个仓库中都有一个 infra submodule 子工程

.gitsubmodules 文件内容
![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/a33ed29edc344f2799c8c3dfd2d14d0e~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1795425336&x-orig-sign=RWSh8sPVR7a5wRrHDORyZUw14j4%3D)

### git 仓库调整

通过引用 naraku 这个 shell 工程, 将所有仓库包揽在 naraku 仓库之下，改造完成后工程结构如下：

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/1c4aca32cdb14ecfa9ddac579f992abd~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1795425336&x-orig-sign=JFoCf%2FMtvioh4BGQSWZWHno%2Baqk%3D)

![2b62af07-d506-4365-9f0d-418424e7a895.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/35c49acb659e459bb37e18c461928196~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1795425336&x-orig-sign=JR7H89Okigfa6Eof6djjEyCYTfw%3D)

### 单体工程改造

#### webpack 调整

这里以 vue-cli 为例，chainWebpack 中加入以下代码

```js
{
    chainWebpack: config => {
    // 配置路径别名
    config.resolve.alias
      .set('@', resolve('src'))
      .set('&', resolve('../infra/src'))
      // .set('@-a', resolve('../apple/src')) // 根据需要增加引用的模块，tsconfig 同样需要
  }
}
```

#### tsconfig.json 调整

```json
{
  "extends": "../../tsconfig.common.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
        "&/*": [
            "../infra/src/*"
        ],
        "@/*": [
            "src/*"
        ]
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "tests/**/*.ts",
    "tests/**/*.tsx",
    "../infra/src/**/*.ts",
    "../infra/src/**/*.tsx",
    "../infra/src/**/*.vue",
    "../infra/src/**/*.ts",
    "../infra/src/**/*.tsx"
  ]
}

```

### 多仓库管理 workspaces 改造

naraku 最外层 package.json 指定 workspaces

```json
{
  "name": "naraku",
  "version": "1.0.0",
  "description": "",
  "private": true, // 一定要指定为私有仓库
  "workspaces": [ // 指定子仓库的 glob 路径
    "apps/*"
  ],
  "main": "index.js",
  "scripts": {
    "alias": "cross-env APP_NAME=${APP_NAME} node script.js run",
    "bundle": "yarn alias bundle",
    "publishBundle": "yarn alias publishBundle"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^24.3.0",
    "@types/webpack-env": "^1.18.8"
  },
  "dependencies": {
    "commander": "^9.5.0",
    "cross-env": "7.0.3",
    "shelljs": "^0.8.5"
  }
}
```

启动工程

```bash
yarn workspace apple run start | build
```

### cicd 改造

通过以上改造之后，单体工程无法单独启动，需要改造通过 naraku 这个 shell 工程启动，构建，我这里是通过在jenkins pipeline 中指定环境变量，来启动不同的工程。

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/b0559ae532904101bed0032200d1c0d0~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5b6Q6Iul5pyo:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIzNTc2NDE1Njg3MjI5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1795425336&x-orig-sign=e26vugBKAgWeX9nB%2BYRygweWG98%3D)

为使用构建需要 ，改造了npm script，所有命令通过 yarn alias 转发， 在根目录新建 script.js

```js
const { Command } = require('commander');
const shelljs = require('shelljs');
const program = new Command();
const path = require('path');

program
  .name('workspace-alias')
  .description('CLI to turn APP_NAME to package.json name utilities')
  .version('1.0.0');

const workspaceMap = generatedAliasMap()
program.command('run')
  .description('Working with APP_NAME to workspace alias')
  .helpOption('-e, --HELP', 'read more information')
  .argument('<string...>', 'e.g. "build" or "start"')
  .option('-w, --workspace <type>', 'workspace: ' + Object.keys(workspaceMap).join(' | '), process.env.APP_NAME)
  .option('-v, --verbose [type]', 'verbose mode, just ouput the shell going to run', false)
  .action((actions, opts) => {
    // 映射目录 与 workspace
    const workspace = workspaceMap[opts.workspace]
    if (!workspace) {
      console.error(`Workspace alias for "${opts.workspace}" not found!`)
      process.exit(1)
    }

    const script =`yarn workspace ${workspace} ${actions.join(' ')}`
    if (opts.verbose) {
      greenLog(script)
      return
    }

    greenLog(script);
    shelljs.exec(script);
  });

program.parse();

function generatedAliasMap () {
  const apps = shelljs.ls('-d', 'apps/*/')
  const aliasMap = apps.reduce((acc, appPath) => {
    const pkg = require(`./${appPath}/package.json`)
    acc[path.basename(appPath)] = pkg.name
    return acc
  }, {})
  return aliasMap
}

function greenLog (msg) {
  console.log('\x1B[32m%s\x1B[0m', msg)
}
```

启动工程

```bash
# yarn alias [action] -w [app_path]
yarn alias start -w infra
```

### 优缺点

#### 优点

1.  通过以上改造实现了保留单体 git 记录。
2.  随着业务的演进，能够实时同步代码。
3.  工程改造量较小。
4.  易于branch 分支管理。

#### 缺点

1.  单体仓库无法启动。
2.  单体仓库的改动可能导致 dashboard 无法正常 work。

### 总结

都看到这里了，如果你有更多好的建议，欢迎在评论区留言。

