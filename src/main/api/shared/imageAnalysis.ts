import { is } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

interface ImageAnalysisResult {
  isSimpleIcon: boolean // 是否是简单图标
  mainColor: string | null // 主色调（RGB hex）
  isDark: boolean // 主色调是否为深色
  needsAdaptation: boolean // 是否需要自适应
}

async function analyzeImage(imagePath: string): Promise<ImageAnalysisResult> {
  try {
    // 提取文件名用于日志显示
    const fileName = imagePath.split(/[/\\]/).pop() || 'unknown'
    
    // 调试日志：输出环境和原始路径
    if (process.env.NODE_ENV !== 'production' || !is.dev) {
      console.log(`[图片分析] ${fileName} | 环境: ${is.dev ? '开发' : '生产'} | 输入: ${imagePath}`)
    }
    
    // 1. 处理不同格式的图片输入
    let imageBuffer: Buffer
    if (imagePath.startsWith('data:image/')) {
      // Base64 格式
      const base64Data = imagePath.split(',')[1]
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // URL 格式 - 暂不支持
      return { isSimpleIcon: false, mainColor: null, isDark: false, needsAdaptation: false }
    } else {
      // 文件路径格式
      let filePath = imagePath
      
      // 处理 file:// 协议
      if (filePath.startsWith('file:')) {
        // 移除 file: 前缀
        filePath = filePath.replace(/^file:\/\/\//, '') // file:///C:/path -> C:/path
          .replace(/^file:\/\//, '') // file://path -> path
          .replace(/^file:\\/, '') // file:\path -> path (Windows 特殊情况)
          .replace(/^file:/, '') // file:path -> path
        
        // 解码 URL 编码的字符（如 %20 -> 空格）
        filePath = decodeURIComponent(filePath)
        
        // 在 Windows 上，确保路径格式正确
        if (process.platform === 'win32') {
          filePath = filePath.replace(/\//g, '\\')
        }
      }
      
      // 处理相对路径
      const appPath = app.getAppPath()
      
      // 在 Windows 上，以 / 开头的路径会被 path.isAbsolute 认为是绝对路径
      // 但对于 Vite 资源路径（如 /src/assets/...），我们需要特殊处理
      if (filePath.startsWith('/src/')) {
        // 开发模式：资源在 src/renderer/src/ 目录下
        const relativePath = filePath.substring(1) // 去掉开头的 /
        filePath = path.join(appPath, 'src', 'renderer', relativePath)
      } else if (filePath.startsWith('./assets/') || filePath.startsWith('assets/')) {
        // 生产模式：Vite 打包后的资源路径（如 ./assets/default-xxx.png）
        // 资源通常在 out/renderer/assets/ 目录下
        const assetPath = filePath.replace(/^\.\//, '') // 移除开头的 ./
        if (is.dev) {
          // 开发模式：先尝试 dist 目录（如果存在）
          const distPath = path.join(appPath, 'out', 'renderer', assetPath)
          try {
            await fs.access(distPath)
            filePath = distPath
          } catch {
            // 如果 dist 不存在，尝试 src 目录
            filePath = path.join(appPath, 'src', 'renderer', assetPath)
          }
        } else {
          // 生产模式：资源在 out/renderer/ 目录下（asar 包内或外）
          filePath = path.join(appPath, 'out', 'renderer', assetPath)
        }
      } else if (!path.isAbsolute(filePath)) {
        // 其他相对路径
        filePath = path.join(appPath, filePath)
      }
      
      // 调试日志：输出最终解析的路径
      if (process.env.NODE_ENV !== 'production' || !is.dev) {
        console.log(`[图片分析] ${fileName} | 解析路径: ${filePath}`)
      }
      
      imageBuffer = await fs.readFile(filePath)
    }

    // 2. 加载图片并获取元数据
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()

    // 3. 检查是否有透明通道
    const hasAlpha = metadata.channels === 4

    if (!hasAlpha) {
      return { isSimpleIcon: false, mainColor: null, isDark: false, needsAdaptation: false }
    }

    // 4. 缩小图片以加快分析（32x32足够）
    const { data, info } = await image
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true })

    // 5. 先找出最常见的颜色作为主色调
    const colorMap = new Map<string, number>()
    let opaquePixels = 0
    let mainColor = ''
    let maxCount = 0

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]

      if (a > 128) {
        // 非透明像素
        opaquePixels++
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const key = `${r},${g},${b}`
        const count = (colorMap.get(key) || 0) + 1
        colorMap.set(key, count)
        
        if (count > maxCount) {
          maxCount = count
          mainColor = key
        }
      }
    }

    if (opaquePixels === 0) {
      return { isSimpleIcon: false, mainColor: null, isDark: false, needsAdaptation: false }
    }

    // 6. 检测颜色相似度 - 统计有多少像素接近主色调
    const [mainR, mainG, mainB] = mainColor.split(',').map(Number)
    const colorThreshold = 30 // RGB欧氏距离 < 30 认为是相似颜色
    let similarPixels = 0

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]

      if (a > 128) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // 计算与主色调的欧氏距离
        const distance = Math.sqrt(
          Math.pow(r - mainR, 2) +
          Math.pow(g - mainG, 2) +
          Math.pow(b - mainB, 2)
        )
        
        if (distance < colorThreshold) {
          similarPixels++
        }
      }
    }

    // 7. 判断是否是纯色图标
    const totalPixels = info.width * info.height
    const transparencyRatio = (totalPixels - opaquePixels) / totalPixels
    const similarityRatio = similarPixels / opaquePixels // 相似像素占比
    
    // 纯色检测：相似像素占比 > 85% 且有一定透明背景（> 10%）
    const isPureColorIcon = similarityRatio > 0.85 && transparencyRatio > 0.1

    // 8. 计算主色调的亮度（判断深色/浅色）
    const [r, g, b] = mainColor.split(',').map(Number)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const isDark = luminance < 0.5
    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

    // 聚合日志输出
    console.log(
      `[图标分析] ${fileName} | 颜色数:${colorMap.size} 透明:${(transparencyRatio * 100).toFixed(0)}% 相似度:${(similarityRatio * 100).toFixed(0)}% 主色:${hexColor}(${isDark ? '深' : '浅'}) | ${isPureColorIcon ? '✓纯色' : '✗复杂'}`
    )

    if (!isPureColorIcon) {
      return { isSimpleIcon: false, mainColor: null, isDark: false, needsAdaptation: false }
    }

    return {
      isSimpleIcon: true,
      mainColor: hexColor,
      isDark,
      needsAdaptation: true
    }
  } catch (error) {
    console.error('图片分析失败:', error)
    return { isSimpleIcon: false, mainColor: null, isDark: false, needsAdaptation: false }
  }
}

// 注册IPC处理器
export function setupImageAnalysisAPI(): void {
  ipcMain.handle('analyze-image', async (_event, imagePath: string) => {
    try {
      return await analyzeImage(imagePath)
    } catch (error) {
      console.error('图片分析失败:', error)
      return { isSimpleIcon: false, mainColor: null, isDark: false, needsAdaptation: false }
    }
  })
}

