![webui-plugin](https://socialify.git.ci/xinglingsuiyue/webui-plugin/image?description=1&font=Raleway&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Auto)

# webui-plugin

- 一个适用于 [Yunzai 系列机器人框架](https://github.com/yhArcadia/Yunzai-Bot-plugins-index) 的Yunzai控制台插件
- 支持插件管理安装与配置，内置 AI 对话能力，带帮助面板与状态图。

## 安装

```sh
cd plugins
git clone --depth=1 https://github.com/Xinglingsuiyue/webui-plugin.git
```


## 使用

启动后主人在 QQ 里发送：

```
#云崽登录
```

拿到带一次性登录码的面板地址，浏览器打开即可。默认只允许本机访问，外网访问需在 `plugins/webui-plugin/config/config/webui.yaml` 填写 `token` 或配置反代地址。

## 功能

**插件管理**：安装、更新、卸载插件，启停单 js 插件，查看与编辑 js 插件源码。

**配置管理**：基础配置、群组配置、插件配置、其他配置等。

**AI 对话**：多渠道与模型、预设管理、群设置、触发方式、工具调用、知识库、回忆、表情库、语音、绘图、MCP 服务、调用统计。

内置预设「大肥鱼」。

**帮助面板**：`#帮助`。配置在 `plugins/webui-plugin/config/config/help.yaml`，可在 WebUI 里点选编辑并预览。

**状态图**：`#状态` 以图片展示运行状态，`#状态 pro` 查看全部账号（默认仅主人，可在 WebUI 放开）。

## 指令

| 指令 | 说明 |
| ---- | ---- |
| `#云崽登录` | 获取控制台地址与临时登录码（仅主人） |
| `#帮助` | 帮助面板，可跟关键词筛选 |
| `#状态` | 运行状态图 |
| `#persona` | 查看人格列表，管理员可切换 |
| `#对话状态` | 当前会话的人格、模型与轮数 |
| `#结束对话` | 清空当前会话上下文 |
| `#我的记忆` `#清除记忆` | 查看、清空个人回忆 |
| `#群聊总结` | 总结本群近期聊天 |
| `#webui更新` | 更新插件自身（仅主人），有本地改动时提示 |
| `#webui强制更新` | 覆盖本地改动，强制更新插件自身（仅主人） |

## 配置

| 文件 | 内容 |
| ---- | ---- |
| `plugins/webui-plugin/config/config/webui.yaml` | 面板路径、令牌、登录指令、状态图清晰度 |
| `plugins/webui-plugin/config/config/ai.yaml` | AI 开关、上下文、触发方式、工具与知识库 |
| `plugins/webui-plugin/config/config/help.yaml` | 帮助面板标题、外观、皮肤、分组 |

上面三份由插件首次加载时从 `config/default_config` 生成到插件目录，缺失也会自动补回；核心其余配置仍在 `config/config`。

数据统一存放在 `data/webui/`。

## 致谢

| Nickname | Contribution |
| -------- | ------------ |
| [chatai-plugin](https://github.com/XxxXTeam/chatai-plugin) | XxxXTeam 的 chatai-plugin |
| [guoba-plugin](https://gitee.com/guoba-yunzai/guoba-plugin) | 锅巴的 guoba-plugin |
| [zhishui-plugin](https://gitee.com/fjcq/zhishui-plugin) | 止水的 zhishui-plugin |
| [yenai-plugin](https://gitee.com/yeyang52/yenai-plugin) | 椰羊的 yenai-plugin |
| [miao-plugin](https://github.com/yoimiya-kokomi/miao-plugin) | 喵喵的 miao-plugin |
