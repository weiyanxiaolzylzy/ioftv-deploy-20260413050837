/*
 * @Author: daidai
 * @Date: 2022-02-23 08:59:26
 * @LastEditors: daidai
 * @LastEditTime: 2022-02-24 17:11:58
 * @FilePath: \big-screen-vue-datav\src\utils\index.js
 */

/**
 * @param {Function} fn 防抖函数
 * @param {Number} delay 延迟时间
 */
export function debounce(fn, delay) {
  var timer;
  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}
/**
 * @param {date} time 需要转换的时间
 * @param {String} fmt 需要转换的格式 如 yyyy-MM-dd、yyyy-MM-dd HH:mm:ss
 */
export function formatTime(time, fmt) {
  if (!time) return '';
  else {
    const date = new Date(time);
    const o = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'H+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds(),
      'q+': Math.floor((date.getMonth() + 3) / 3),
      S: date.getMilliseconds(),
    };
    if (/(y+)/.test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        (date.getFullYear() + '').substr(4 - RegExp.$1.length)
      );
    for (const k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1
            ? o[k]
            : ('00' + o[k]).substr(('' + o[k]).length)
        );
      }
    }
    return fmt;
  }
}

export function getUserInfo() {
  try {
    const raw = localStorage.getItem('userInfo')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch (e) {
    return null
  }
}

export function getUserRole() {
  const info = getUserInfo()
  const role = info && info.role
  return role ? String(role) : 'viewer'
}

export function canEditFeature(featureKey) {
  const role = getUserRole()
  if (role === 'admin') return true
  if (role === 'operator') {
    return ['monthly_star', 'monthly_ranking', 'today_plan', 'groups'].includes(featureKey)
  }
  return false
}

export function getAuthHeaders(extra = {}) {
  return {
    'x-user-role': getUserRole(),
    ...extra
  }
}

export async function saveBlobWithPicker(blob, filename = 'download.bin', options = {}) {
  const safeName = String(filename || 'download.bin').trim() || 'download.bin'
  const blobData = blob instanceof Blob ? blob : new Blob([blob], options.type ? { type: options.type } : undefined)
  const pickerTypes = Array.isArray(options.types) ? options.types : []

  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName: safeName,
      types: pickerTypes.length ? pickerTypes : undefined
    })
    const writable = await handle.createWritable()
    await writable.write(blobData)
    await writable.close()
    return { savedWithPicker: true, filename: safeName }
  }

  const url = URL.createObjectURL(blobData)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = safeName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    URL.revokeObjectURL(url)
  }
  return { savedWithPicker: false, filename: safeName }
}
