// main.js - 主进程文件
const { app, BrowserWindow, globalShortcut, ipcMain, Notification, Tray, Menu } = require('electron');
const Store = require('electron-store');
const path = require('path');

// 初始化存储
const store = new Store();

// 窗口引用
let mainWindow = null;
let quickEntryWindow = null;
let tray = null;
let isQuitting = false;

// 创建托盘图标
function createTray() {
  // 使用合适的图标文件
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
      click: () => {
        if (mainWindow === null) {
          createMainWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: '快速记录',
      click: () => {
        if (quickEntryWindow === null) {
          createQuickEntryWindow();
        } else {
          quickEntryWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('WorkLogger');
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    if (mainWindow === null) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
}

// 创建主窗口
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // 处理窗口关闭后的清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 创建快速录入窗口
function createQuickEntryWindow() {
  quickEntryWindow = new BrowserWindow({
    width: 600,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  quickEntryWindow.loadFile('quick-entry.html');
  
  // 窗口失去焦点时自动关闭
  quickEntryWindow.on('blur', () => {
    if (quickEntryWindow) {
      quickEntryWindow.hide();
    }
  });

  // 处理窗口关闭后的清理
  quickEntryWindow.on('closed', () => {
    quickEntryWindow = null;
  });
}

// 注册全局快捷键
function registerShortcuts() {
  // 先注销所有快捷键，防止重复注册
  globalShortcut.unregisterAll();
  
  const shortcut = store.get('quickEntryShortcut', 'CommandOrControl+Shift+Space');
  const success = globalShortcut.register(shortcut, () => {
    if (quickEntryWindow === null) {
      createQuickEntryWindow();
    }
    quickEntryWindow.show();
  });

  if (!success) {
    console.log('快捷键注册失败');
  }
}

// 监听系统事件
function setupSystemMonitor() {
  const powerMonitor = require('electron').powerMonitor;
  
  powerMonitor.on('suspend', () => {
    logSystemEvent('设备进入待机状态');
  });

  powerMonitor.on('resume', () => {
    logSystemEvent('设备被唤醒');
  });
}

// 通知定时器
let notificationTimer = null;
let defaultReminderTimer = null; // 默认提醒定时器
let hasUserRecordToday = false; // 记录用户今天是否有主动记录

// 检查是否在工作时间内
function isWithinWorkHours(time, endTime) {
  const now = time || new Date();
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const endTimeToday = new Date(now);
  endTimeToday.setHours(endHour, endMinute, 0);
  
  return now < endTimeToday;
}

// 设置默认提醒
function setupDefaultReminders() {
  // 清除已有的默认提醒
  if (defaultReminderTimer) {
    clearInterval(defaultReminderTimer);
  }

  // 每分钟检查一次是否需要默认提醒
  defaultReminderTimer = setInterval(() => {
    if (hasUserRecordToday) return; // 如果用户今天有记录，不触发默认提醒

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 在 12:00 和 18:00 触发提醒
    if ((hour === 12 || hour === 18) && minute === 0) {
      new Notification({
        title: '工作记录提醒',
        body: '今天还没有记录工作内容哦，现在开始记录吧~',
        silent: false
      }).show();
    }
  }, 60000); // 每分钟检查一次
}

// 重置每日状态
function resetDailyStatus() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // 在每天凌晨重置状态
  if (hour === 0 && minute === 0) {
    hasUserRecordToday = false;
  }
}

// 重置提醒定时器
function resetNotificationTimer() {
  const reminderEnabled = store.get('reminderEnabled', true);
  const endTime = store.get('endTime', '18:00');
  
  // 如果提醒被禁用或不在工作时间内，清除定时器
  if (!reminderEnabled || !isWithinWorkHours(null, endTime)) {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }
    return;
  }

  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }

  const reminderInterval = store.get('reminderInterval', 30) * 60 * 1000; // 转换为毫秒
  notificationTimer = setTimeout(() => {
    if (isWithinWorkHours(null, endTime)) {
      new Notification({
        title: '工作记录提醒',
        body: '投入新的工作了么？记一下吧~',
        silent: false
      }).show();
      // 继续设置下一次提醒
      resetNotificationTimer();
    }
  }, reminderInterval);
}

// 记录系统事件
function logSystemEvent(event) {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    type: 'system',
    content: event
  };
  
  const logs = store.get('logs', []);
  logs.push(log);
  store.set('logs', logs);
}

// 监听渲染进程事件
// 监听提醒间隔设置变更
ipcMain.on('update-reminder-interval', (event, interval) => {
  store.set('reminderInterval', interval);
  resetNotificationTimer();
});

ipcMain.on('log-work', (event, content) => {
  // 重置提醒定时器
  resetNotificationTimer();
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    type: 'manual',
    content
  };
  
  const logs = store.get('logs', []);
  logs.push(log);
  store.set('logs', logs);
  
  if (quickEntryWindow) {
    quickEntryWindow.hide();
  }
});

// 添加关闭快速录入窗口的事件处理
ipcMain.on('close-quick-entry', () => {
  if (quickEntryWindow) {
    quickEntryWindow.hide();
  }
});

// 监听快捷键设置变更
ipcMain.on('update-shortcut', (event, shortcut) => {
  store.set('quickEntryShortcut', shortcut);
  registerShortcuts();
});

// APP 生命周期
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  setupSystemMonitor();
  setupDefaultReminders();
  
  // 设置每分钟检查以重置每日状态
  setInterval(resetDailyStatus, 60000);
  
  // 自动启动配置
  app.setLoginItemSettings({
    openAtLogin: store.get('autoLaunch', false)
  });
  
  // 注册快捷键
  registerShortcuts();
});

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 当所有窗口关闭时
app.on('window-all-closed', (e) => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
  }
});

// 当应用被激活时（macOS）
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }
  if (defaultReminderTimer) {
    clearInterval(defaultReminderTimer);
  }
});