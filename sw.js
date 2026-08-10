// Service Worker — Convie记账本 PWA
// 缓存 shell 文件，支持离线访问

const CACHE_NAME = 'convie-v1'
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json'
]

// 安装：预缓存 shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  )
  // 跳过等待，立即激活
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// 请求拦截：缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过 chrome-extension 和非 GET 请求
  if (event.request.method !== 'GET') return
  if (event.request.url.startsWith('chrome-extension://')) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        // 只缓存同源资源
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // 离线且无缓存时返回空
        return new Response('', { status: 408 })
      })
    })
  )
})