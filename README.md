# 徐若木的博客

基于 [Nikola](https://getnikola.com/) 的静态博客，发布到 GitHub Pages。

## 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Python | 3.12.8 | 用 pyenv 管理，见下 |
| Nikola | 8.3.3 | `nikola --version` 确认 |

## 首次进入项目：切换 Python 版本

```bash
# 项目根已放 .python-version，pyenv 进入目录自动切换
cd github-blog && python --version   # 应输出 Python 3.12.8

# 若未自动切换，手动指定：
pyenv local 3.12.8
# 注意：pyenv local 只写 .python-version 文件，当前终端不会立即切换！
# 执行后需重新进入目录（cd .）或新开终端，再验证：
pyenv version   # 应输出 3.12.8
```

> 注意：若 shell 里 `nikola: command not found`，多半是当前 shell 没加载 pyenv
> 环境（常见于后台任务）。此时用完整路径：
> `/Users/michael/.pyenv/versions/3.12.8/bin/nikola`

## 常用命令（Makefile）

```bash
make serve          # 构建并本地预览（自动开浏览器）
make dev            # 开发模式：改文件自动构建
make add            # 新建文章（markdown）
make deploy         # 部署到 GitHub Pages（提交说明默认"更新博客"）
make deploy msg="发布新歌"   # 自定义提交说明
```

## 发布流程

- 源码分支：`src`；发布分支：`master`（GitHub Pages 源）
- `make deploy` 内部执行 `nikola github_deploy`：构建 → 推 `src` → 用 ghp-import 推 `output/` 到 `master`
- 发布前检查：文章 date 不能是未来时间（首页不收录）；slug 不能与已有文章重复

## 目录速查

| 目录 | 用途 |
|---|---|
| `posts/` | 文章源文件（markdown + metadata） |
| `pages/` | 独立页面（非文章） |
| `files/` | 原样复制到站点的静态资源（favicon、自定义 JS/CSS） |
| `images/` | 文章配图 |
| `galleries/` | 相册目录（子目录=一个相册，自动生成相册页） |
| `themes/willy-theme/` | 当前主题（含分类主题 cat-*.css、资源注入宏 cat_resources.tmpl） |
| `conf.py` | 站点全部配置 |

## 站点关键配置备忘

- 语言：`zh_cn`（不能用 `zh`，会报错）
- `USE_BUNDLES = False`：willy-theme 无 bundles 目录，必须关闭否则主题样式丢失
- 文章置顶：metadata 加 `.. priority: 10`（数值越大越靠前，默认 0）
- 自定义 JS：放 `files/assets/js/`，在 conf.py 用 `BODY_END` 挂载（不能放 GLOBAL_CONTEXT）
