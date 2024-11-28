// summary.js - 工作总结生成器
class WorkSummary {
    constructor(logs, endTime) {
      this.logs = logs;
      this.endTime = endTime || '18:00'; // 默认结束时间，作为兜底方案
    }
  
    // 获取指定日期的日志
    getDayLogs(date) {
      const targetDate = new Date(date).toISOString().split('T')[0];
      return this.logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === targetDate;
      });
    }
  
    // [修改] 获取计算的截止时间
    getEndTime(date, currentTime) {
      const targetDate = new Date(date).toISOString().split('T')[0];
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      if (targetDate === today) {
        // 如果是当天，使用当前时间
        return currentTime || now;
      } else {
        // 如果是历史记录，使用设置的结束时间
        return new Date(`${date}T${this.endTime}`);
      }
    }
  
    // 计算工作时长（考虑系统待机时间）
    calculateWorkDuration(startTime, endTime, systemLogs) {
      let duration = 0;
      let currentStart = new Date(startTime);
      let currentEnd = new Date(endTime);
      
      // 处理系统待机时间
      systemLogs.forEach(log => {
        const logTime = new Date(log.timestamp);
        if (logTime >= currentStart && logTime <= currentEnd) {
          if (log.content === '设备进入待机状态') {
            duration += (logTime - currentStart);
            currentStart = null;
          } else if (log.content === '设备被唤醒' && currentStart === null) {
            currentStart = logTime;
          }
        }
      });
      
      if (currentStart !== null) {
        duration += (currentEnd - currentStart);
      }
      
      return duration;
    }
  
    // [修改] 生成日报总结，添加currentTime参数
    generateDailySummary(date, currentTime = null) {
      const dayLogs = this.getDayLogs(date);
      if (dayLogs.length === 0) return null;
  
      // 获取工作记录和系统记录
      const workLogs = dayLogs.filter(log => log.type === 'manual');
      const systemLogs = dayLogs.filter(log => log.type === 'system');
  
      // 第一条工作记录时间
      const firstWorkTime = new Date(workLogs[0].timestamp);
      const firstWorkTimeStr = firstWorkTime.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
  
      // [修改] 使用新的getEndTime方法获取截止时间
      const endTimeToday = this.getEndTime(date, currentTime);
      const totalDuration = this.calculateWorkDuration(
        firstWorkTime,
        endTimeToday,
        systemLogs
      );
  
      // [修改] 计算各项工作时长，考虑当前时间
      const workDurations = workLogs.map((log, index) => {
        const nextLog = workLogs[index + 1];
        const endTime = nextLog 
          ? new Date(nextLog.timestamp) 
          : endTimeToday;
        const duration = this.calculateWorkDuration(
          new Date(log.timestamp),
          endTime,
          systemLogs
        );
        return {
          content: log.content,
          duration
        };
      });
  
      // 找出最长和最短工作
      const longestWork = workDurations.reduce((a, b) => 
        a.duration > b.duration ? a : b
      );
      const shortestWork = workDurations.reduce((a, b) => 
        a.duration < b.duration ? a : b
      );
  
      return {
        startTime: firstWorkTimeStr,
        totalTasks: workLogs.length,
        totalDuration: this.formatDuration(totalDuration),
        longestWork: {
          content: longestWork.content,
          duration: this.formatDuration(longestWork.duration)
        },
        shortestWork: {
          content: shortestWork.content,
          duration: this.formatDuration(shortestWork.duration)
        }
      };
    }
  
    // 格式化时长
    formatDuration(ms) {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return { hours, minutes };
    }
  }
  
  module.exports = WorkSummary;