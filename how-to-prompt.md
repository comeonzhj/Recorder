# 应用代码生成

协助我开发一个 Mac 端的 APP，它包含如下功能

## 功能概览

这是一个用户可以随时唤起，记下当前正在做的事情和时间，每日生成工作小结的 APP。

## 功能细节
### 界面
这个 APP 拥有三个界面：

#### 界面一：唤起界面
用户使用快捷键唤醒时，界面类似 spotlight，提供一个输入框。按回车记录信息后隐藏。

#### 界面二：主界面
这个界面包含三个页面：
- 记录查看页：
    - 用户输入信息后，APP 会记下记录的时间和用户输入的工作内容，在记录页面展示列表。
    - 这个页面是两栏布局，左侧为目录栏，按“天”分组，组内是记录的时间，点击后在右侧可查看记录的内容。
- 设置页面：
    - 用户可以在这里配置唤醒 APP 的快捷键
    - 用户可以在这里设置每日工作的计时结束时间
    - 用户可以在这里设置是否开启自动启动
- 总结页面：
    - 用户在记录查看页可以进入总结页面。
    - 两栏布局，左侧为目录栏，显示日期（格式 2024-11-19），点击日期显示当日的工作记录总结。

### 功能逻辑
用户使用快捷键唤醒记录输入框，输入工作内容后，连通当前的时间（最小到分钟，2024-11-19 14:30）一起保存。
监控电脑息屏、进入待机模式或挂机的状态，作为与用户主动记录同级别的日志，保存。
每一天用户在此 APP 下可以得到类似如下的日志：
```
2024-11-19 10:29 [录入]写公众号
2024-11-19 11:34 [系统]设备进入待机状态
2024-11-19 11:44 [系统]设备被唤醒
2024-11-19 12:23 [录入]吃午饭&午休
2024-11-19 13:30 [录入]开例会
2024-11-19 14:02 [录入]写私域文案
……
```
基于以上的日志，在用户进入总结页面时，会为用户生成当日的工作小节，逻辑如下：
- 以用户第一次主动录入的时间为起点，总结一句话：今天从 10:29 开始工作
- 统计一共主动录入了多少工作，总结一句话：今天干了x件事
- 统计今日累计工作时长（用户主动生成小节的时间或计时结束时间-第一件事记录时间，去掉中间系统待机等时间），总结一句话：今天累计工作x小时x分钟
- 计算每件事的工作时间（下一件事的开始时间或用户设置的计时结束时间-这件事的开始时间，去掉中间系统待机的时间），总结一句话：今天耗时最久的工作是{用户记录的工作内容耗时最长的那个}，用了x小时x分钟；{用户记录的工作内容耗时最短的那个}干的最快，只用了x小时x分钟

---

# 应用美化

阅读这个项目的代码，分析它实现的功能。在不改变功能实现逻辑的基础上，为这个应用设计一个更好简洁的UI 界面
