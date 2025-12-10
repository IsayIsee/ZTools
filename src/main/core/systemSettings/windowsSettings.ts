import { app } from 'electron'
import path from 'path'

export interface SystemSetting {
  name: string
  nameEn?: string
  uri: string
  category: string
  icon: string
  keywords?: string[]
}

// 获取系统设置统一图标路径（返回 file:// 协议 URL）
function getSystemSettingIcon(): string {
  let iconFilePath: string
  
  if (app.isPackaged) {
    // 打包后使用 resources 目录
    iconFilePath = path.join(process.resourcesPath, 'icons', 'settings-fill.png')
  } else {
    // 开发模式：从 app.getAppPath() 获取项目根目录
    iconFilePath = path.join(app.getAppPath(), 'resources', 'icons', 'settings-fill.png')
  }
  
  // 直接返回 file:// 协议 URL（与应用图标处理方式一致）
  return `file:///${iconFilePath}`
}

const iconPath = getSystemSettingIcon()

export const WINDOWS_SETTINGS: SystemSetting[] = [
  // 系统（8项）
  { name: '显示设置', nameEn: 'Display', uri: 'ms-settings:display', category: '系统', icon: iconPath },
  { name: '声音设置', nameEn: 'Sound', uri: 'ms-settings:sound', category: '系统', icon: iconPath },
  { name: '电源和睡眠', nameEn: 'Power', uri: 'ms-settings:powersleep', category: '系统', icon: iconPath },
  { name: '存储', nameEn: 'Storage', uri: 'ms-settings:storagesense', category: '系统', icon: iconPath },
  { name: '通知', nameEn: 'Notifications', uri: 'ms-settings:notifications', category: '系统', icon: iconPath },
  { name: '多任务', nameEn: 'Multitasking', uri: 'ms-settings:multitasking', category: '系统', icon: iconPath },
  { name: '平板模式', nameEn: 'Tablet', uri: 'ms-settings:tabletmode', category: '系统', icon: iconPath },
  { name: '系统信息', nameEn: 'About', uri: 'ms-settings:about', category: '系统', icon: iconPath },
  
  // 网络（4项）
  { name: '网络和 Internet', nameEn: 'Network', uri: 'ms-settings:network', category: '网络', icon: iconPath },
  { name: 'Wi-Fi', uri: 'ms-settings:network-wifi', category: '网络', icon: iconPath },
  { name: '以太网', nameEn: 'Ethernet', uri: 'ms-settings:network-ethernet', category: '网络', icon: iconPath },
  { name: 'VPN', uri: 'ms-settings:network-vpn', category: '网络', icon: iconPath },
  
  // 个性化（6项）
  { name: '个性化', nameEn: 'Personalization', uri: 'ms-settings:personalization', category: '个性化', icon: iconPath },
  { name: '背景', nameEn: 'Background', uri: 'ms-settings:personalization-background', category: '个性化', icon: iconPath },
  { name: '颜色', nameEn: 'Colors', uri: 'ms-settings:personalization-colors', category: '个性化', icon: iconPath },
  { name: '锁屏', nameEn: 'Lock Screen', uri: 'ms-settings:lockscreen', category: '个性化', icon: iconPath },
  { name: '主题', nameEn: 'Themes', uri: 'ms-settings:themes', category: '个性化', icon: iconPath },
  { name: '开始菜单', nameEn: 'Start', uri: 'ms-settings:personalization-start', category: '个性化', icon: iconPath },
  
  // 应用（4项）
  { name: '应用和功能', nameEn: 'Apps', uri: 'ms-settings:appsfeatures', category: '应用', icon: iconPath },
  { name: '默认应用', nameEn: 'Default Apps', uri: 'ms-settings:defaultapps', category: '应用', icon: iconPath },
  { name: '启动应用', nameEn: 'Startup', uri: 'ms-settings:startupapps', category: '应用', icon: iconPath },
  { name: '可选功能', nameEn: 'Optional', uri: 'ms-settings:optionalfeatures', category: '应用', icon: iconPath },
  
  // 账户（3项）
  { name: '你的信息', nameEn: 'Your Info', uri: 'ms-settings:yourinfo', category: '账户', icon: iconPath },
  { name: '邮件账户', nameEn: 'Email', uri: 'ms-settings:emailandaccounts', category: '账户', icon: iconPath },
  { name: '登录选项', nameEn: 'Sign-in', uri: 'ms-settings:signinoptions', category: '账户', icon: iconPath },
  
  // 时间和语言（4项）
  { name: '日期和时间', nameEn: 'Date & Time', uri: 'ms-settings:dateandtime', category: '时间', icon: iconPath },
  { name: '区域', nameEn: 'Region', uri: 'ms-settings:regionlanguage', category: '语言', icon: iconPath },
  { name: '语言', nameEn: 'Language', uri: 'ms-settings:keyboard', category: '语言', icon: iconPath },
  { name: '语音', nameEn: 'Speech', uri: 'ms-settings:speech', category: '语言', icon: iconPath },
  
  // 更新和安全（3项）
  { name: 'Windows 更新', nameEn: 'Update', uri: 'ms-settings:windowsupdate', category: '更新', icon: iconPath },
  { name: '安全中心', nameEn: 'Security', uri: 'ms-settings:windowsdefender', category: '安全', icon: iconPath },
  { name: '备份', nameEn: 'Backup', uri: 'ms-settings:backup', category: '更新', icon: iconPath },
  
  // 隐私（2项）
  { name: '隐私', nameEn: 'Privacy', uri: 'ms-settings:privacy', category: '隐私', icon: iconPath },
  { name: '诊断反馈', nameEn: 'Diagnostics', uri: 'ms-settings:privacy-feedback', category: '隐私', icon: iconPath },
  
  // 辅助功能（2项）
  { name: '辅助功能', nameEn: 'Ease of Access', uri: 'ms-settings:easeofaccess', category: '辅助', icon: iconPath },
  { name: '放大镜', nameEn: 'Magnifier', uri: 'ms-settings:easeofaccess-magnifier', category: '辅助', icon: iconPath },
]

