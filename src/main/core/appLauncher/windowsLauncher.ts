import { shell } from 'electron'

export async function launchApp(appPath: string): Promise<void> {
  // 检查是否是系统设置 URI
  if (appPath.startsWith('ms-settings:')) {
    try {
      await shell.openExternal(appPath)
      console.log(`成功打开系统设置: ${appPath}`)
      return
    } catch (error) {
      console.error('打开系统设置失败:', error)
      throw error
    }
  }
  
  // 原有的应用启动逻辑
  return new Promise((resolve, reject) => {
    shell
      .openPath(appPath)
      .then((error) => {
        if (error) {
          console.error('启动应用失败:', error)
          reject(new Error(error))
        } else {
          console.log(`成功启动应用: ${appPath}`)
          resolve()
        }
      })
      .catch((error) => {
        console.error('启动应用失败:', error)
        reject(error)
      })
  })
}
