# 乐予爱游戏：月野寻光记

一个单页网页小游戏：露娜是一只背着月光背包的小兔兔，会在 100 道动态生成的月门之间冒险。页面不再展示配置内容，实际关卡由配置中的章节、种子和成长规则实时生成。

## 运行

在项目根目录启动静态文件服务：

```bash
cd /Users/ggec/Documents/Workspace/projects/Tools
python3 -m http.server 8080 --bind 0.0.0.0
```

打开：

- `http://127.0.0.1:8080/bunny_adventure/`
- `http://你的局域网 IP:8080/bunny_adventure/`

## 玩法

- `WASD` / 方向键移动
- `Shift` 冲刺
- 收集足够胡萝卜后，进入月门推进到下一关
- 体力耗尽会回到当前关起点
- 共 100 关，难度和障碍会随进度上涨

## 动态关卡

配置入口仍然在 [game-config.json](./game-config.json)，但页面上不再直接展示它。当前关卡由这些配置动态拼出：

- `seed`：世界种子，控制每次生成的关卡序列
- `progression`：总关数、胡萝卜需求、障碍增长速度
- `chapters[]`：章节配色、地形词汇、NPC、剧情碎片
- `hazards[]`：障碍种类和视觉颜色

## 大模型接入

配置中的 `lore.endpoint` 预留了旁白生成接口。填入一个支持 OpenAI Chat Completions 的地址后，游戏会在进入关卡时尝试请求一句新的诗意旁白；为空时默认使用本地程序化文案。

## GitHub 提交说明

本地代码可以直接提交；如果当前仓库还没有远端，需要先为这个目录创建或绑定 GitHub 仓库后再 push。
