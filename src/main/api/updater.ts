import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { getLanzouDownloadLink, getLanzouFolderFileList } from '../utils/lanzou.js'
import { downloadFile } from '../utils/download.js'
import { spawn } from 'child_process'

/**
 * 升级管理 API
 */
export class UpdaterAPI {
  private updateCheckUrl = 'https://ilt.lanzouu.com/b0pn8htad'
  private updateCheckPwd = '1f8i'

  public init(): void {
    this.setupIPC()
  }

  private setupIPC(): void {
    ipcMain.handle('updater:check-update', () => this.checkUpdate())
    ipcMain.handle('updater:start-update', (_event, updateInfo) => this.startUpdate(updateInfo))
  }

  /**
   * 检查更新
   */
  private async checkUpdate(): Promise<any> {
    try {
      // 1. 获取文件列表
      const fileList = await getLanzouFolderFileList(this.updateCheckUrl, this.updateCheckPwd)
      if (!Array.isArray(fileList) || fileList.length === 0) {
        throw new Error('更新文件列表为空')
      }

      // 2. 查找最新的更新信息文件
      // 格式: ztools_update_1.0.1.txt
      let latestFile: any = null
      let latestVersion = '0.0.0'
      const versionRegex = /ztools_update_(\d+(\.\d+)*)\.txt/

      for (const file of fileList) {
        const match = file.name_all.match(versionRegex)
        if (match) {
          const version = match[1]
          if (this.compareVersions(version, latestVersion) > 0) {
            latestVersion = version
            latestFile = file
          }
        }
      }

      if (!latestFile) {
        console.log('没有找到更新文件')
        // 没有找到更新文件
        return { hasUpdate: false }
      }

      // 3. 比较当前版本
      const currentVersion = app.getVersion()
      if (this.compareVersions(latestVersion, currentVersion) <= 0) {
        return { hasUpdate: false, latestVersion, currentVersion }
      }

      console.log(`发现新版本: ${latestVersion}, 当前版本: ${currentVersion}`)

      // 4. 下载并解析更新信息
      const filePageUrl = 'https://ilt.lanzouu.com/' + latestFile.id
      const downloadLink = await getLanzouDownloadLink(filePageUrl)

      const tempDir = path.join(app.getPath('userData'), 'ztools-update-check')
      await fs.mkdir(tempDir, { recursive: true })
      const tempFilePath = path.join(tempDir, `update-info-${Date.now()}.json`)

      try {
        await downloadFile(downloadLink, tempFilePath)
        const content = await fs.readFile(tempFilePath, 'utf-8')
        // Lanzou text files might have BOM or weird encoding, but usually utf8 is fine
        // Sometimes JSON might be malformed if uploaded as txt, but we assume it's valid JSON content
        const updateInfo = JSON.parse(content)

        // 确保包含必要字段
        if (!updateInfo.version || !updateInfo.downloadUrl) {
          throw new Error('更新信息格式错误')
        }

        return {
          hasUpdate: true,
          currentVersion,
          latestVersion,
          updateInfo
        }
      } finally {
        // 清理临时文件
        try {
          await fs.rm(tempDir, { recursive: true, force: true })
        } catch (e) {
          console.error(e)
        }
      }
    } catch (error: any) {
      console.error('检查更新失败:', error)
      return { success: false, error: error.message || '检查更新失败' }
    }
  }

  /**
   * 开始更新
   */
  private async startUpdate(updateInfo: any): Promise<any> {
    try {
      console.log('开始更新流程...', updateInfo)
      const downloadUrl = updateInfo.downloadUrl

      // 1. 获取真实下载链接
      const realDownloadUrl = await getLanzouDownloadLink(downloadUrl)

      // 2. 下载更新包
      const tempDir = path.join(app.getPath('userData'), 'ztools-update-pkg')
      await fs.mkdir(tempDir, { recursive: true })
      const tempZipPath = path.join(tempDir, `update-${Date.now()}.zip`)
      const extractPath = path.join(tempDir, `extracted-${Date.now()}`)

      console.log('下载更新包...', realDownloadUrl)
      await downloadFile(realDownloadUrl, tempZipPath)

      // 3. 解压
      console.log('解压更新包...')
      console.log('tempZipPath', tempZipPath)
      console.log('extractPath', extractPath)
      await fs.mkdir(extractPath, { recursive: true })

      const zip = new AdmZip(tempZipPath)
      try {
        await new Promise<void>((resolve, reject) => {
          zip.extractAllToAsync(extractPath, true, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })

        // 重命名 app.asar.tmp -> app.asar
        // 因为打包时为了避免被识别为 asar 导致解压问题，重命名为了 app.asar.tmp
        const appAsarTmp = path.join(extractPath, 'app.asar.tmp')
        const appAsar = path.join(extractPath, 'app.asar')
        try {
          await fs.access(appAsarTmp)
          await fs.rename(appAsarTmp, appAsar)
          console.log('成功重命名: app.asar.tmp -> app.asar')
        } catch (e) {
          console.log('未找到 app.asar.tmp，可能直接是 app.asar 或位置不同', e)
        }
      } catch (err) {
        throw new Error(`解压失败: ${err}`)
      }

      // 4. 寻找 app.asar
      const asarSrc = path.join(extractPath, 'app.asar')
      const unpackedSrc = path.join(extractPath, 'app.asar.unpacked')
      console.log('找到更新文件:', { asarSrc, unpackedSrc })

      // 5. 准备 Updater 参数
      const isMac = process.platform === 'darwin'
      const isWin = process.platform === 'win32'

      let updaterPath = ''
      const appPath = process.execPath
      let asarDst = ''
      let unpackedDst = ''

      console.log('appPath', appPath)

      if (isMac) {
        // macOS
        // appPath: .../Contents/MacOS/zTools
        // resourcesPath: .../Contents/Resources
        // updaterPath: .../Contents/MacOS/ztools-updater (我们放这里)
        const contentsDir = path.dirname(path.dirname(appPath)) // .../Contents
        const resourcesDir = path.join(contentsDir, 'Resources')

        if (!app.isPackaged) {
          updaterPath = path.join(app.getAppPath(), 'src/updater/mac-arm64/ztools-updater')
        } else {
          updaterPath = path.join(path.dirname(appPath), 'ztools-updater')
        }

        asarDst = path.join(resourcesDir, 'app.asar')
        unpackedDst = path.join(resourcesDir, 'app.asar.unpacked')
      } else if (isWin) {
        // Windows
        // appPath: .../zTools.exe
        // resourcesPath: .../resources
        // updaterPath: .../ztools-updater.exe (我们放应用根目录)
        updaterPath = path.join(path.dirname(appPath), 'ztools-updater.exe')
        const resourcesDir = path.join(path.dirname(appPath), 'resources')

        asarDst = path.join(resourcesDir, 'app.asar')
        unpackedDst = path.join(resourcesDir, 'app.asar.unpacked')
      }

      // 检查 updater 是否存在
      try {
        await fs.access(updaterPath)
      } catch {
        throw new Error(`找不到升级程序: ${updaterPath}`)
      }

      // 6. 启动 Updater
      const args = ['--asar-src', asarSrc, '--asar-dst', asarDst, '--app', appPath]

      if (unpackedSrc) {
        args.push('--unpacked-src', unpackedSrc)
        args.push('--unpacked-dst', unpackedDst)
      }

      console.log('启动升级程序:', updaterPath, args)

      // 使用 spawn detached 启动
      const subprocess = spawn(updaterPath, args, {
        detached: true,
        stdio: 'ignore'
      })

      subprocess.unref()

      // 7. 退出应用
      console.log('应用即将退出进行更新...')
      app.quit()

      return { success: true }
    } catch (error: any) {
      console.error('更新流程失败:', error)
      return { success: false, error: error.message }
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }
    return 0
  }
}

export default new UpdaterAPI()
