export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

export function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: '最高',
    2: '高',
    3: '中',
    4: '低',
    5: '最低',
  };
  return labels[priority] || '中';
}

export function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-blue-100 text-blue-800',
    5: 'bg-gray-100 text-gray-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

export function downloadJSON(data: any, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        resolve(JSON.parse(content));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function getExceptionTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    shortage: '缺货',
    incomplete: '信息不完整',
    area_pending: '配送区域待确认',
    cancelled: '临时取消发放',
  };
  return labels[type || ''] || '无异常';
}

export function getExceptionTypeColor(type: string | null): string {
  const colors: Record<string, string> = {
    shortage: 'bg-red-100 text-red-800',
    incomplete: 'bg-amber-100 text-amber-800',
    area_pending: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[type || ''] || 'bg-gray-100 text-gray-800';
}

export function getExceptionStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
  };
  return labels[status || ''] || '无异常';
}

export function getExceptionStatusColor(status: string | null): string {
  const colors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-800',
    processing: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
  };
  return colors[status || ''] || 'bg-gray-100 text-gray-800';
}

export function getExceptionPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: '紧急',
    2: '高',
    3: '普通',
  };
  return labels[priority] || '普通';
}

export function getExceptionPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
  };
  return colors[priority] || 'bg-yellow-100 text-yellow-800';
}

export function getBatchStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_progress: '进行中',
    pending_review: '待复核',
    completed: '已完成',
  };
  return labels[status] || '未知';
}

export function getBatchStatusColor(status: string): string {
  const colors: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-800',
    pending_review: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getBatchStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    in_progress: '🔄',
    pending_review: '⏳',
    completed: '✅',
  };
  return icons[status] || '❓';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
