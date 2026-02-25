# Slide 功能子系统设计文档

  ## 概述

  Slide 功能子系统是 Excalidraw
  集成中的核心模块，负责管理幻灯片创建、渲染、拖拽、缩放以及与录制功能的集成。

  ## 核心组件

  ### 1. 状态管理 (editor-jotai.ts)

  - slidesAtom - Slide 列表
  - activeSlideIdAtom - 当前激活的 slide
  - focusedSlideIdAtom - 聚焦的 slide
  - scrollTargetAtom - 滚动目标位置
  - isRecordingAtom - 录制模式状态
  - recordingAreaSizeAtom - 录制区域尺寸
  - recordingZoomAtom - 缩放值

  ### 2. 组件架构

  App.tsx
  ├── CanvasSlides        # 画布上渲染 slide
  ├── SlideNavigator      # Slide 导航栏
  ├── RecordingToolbar    # 录制工具栏
  └── RecordingOverlay   # 录制区域叠加层

  ### 3. 坐标系统

  - **屏幕坐标**: 浏览器窗口像素坐标
  - **画布坐标**: Excalidraw 逻辑坐标（Slide 使用）
  - **渲染坐标**: 最终渲染坐标 = (画布坐标 + scroll) * zoom

  ### 4. 核心流程

  **点击录制时 slide 定位：**
  1. 计算缩放: zoom = 录制区域宽度 / slide宽度
  2. 发送 excalidraw-recording-setup 事件设置 zoom 和 scroll
  3. 计算目标位置: targetX = 录制区域x / zoom
  4. 平移所有 slides 使第一个 slide 与录制区域重合

  **切换 slide 时平移：**
  1. 获取被点击 slide 的当前位置
  2. 目标位置 = 录制区域左上角 / zoom
  3. 计算偏移量 offset = target - current
  4. 所有 slides 整体平移 offset，保持相对位置

  **元素跟随：**
  - 当 slide 位置变化时，自动更新属于该 slide 的元素位置

  ### 5. 录制配置持久化

  使用 localStorage 保存用户选择的画面比例 (excalidraw-recording-aspect-ratio)
