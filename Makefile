.PHONY: serve

# 本地预览：构建后启动服务器并自动打开浏览器
serve:
	nikola build && nikola serve -b

# 开发模式：自动构建并启动服务器	
dev:
	nikola auto

# 部署：构建并部署到GitHub Pages
deploy:
	nikola github_deploy

add:
	nikola new_post -f markdown
