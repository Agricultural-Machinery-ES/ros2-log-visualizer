import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { streamSSE } from 'hono/streaming'
import fs from 'fs-extra'
import path from 'node:path'
import os from 'node:os'
import dayjs from 'dayjs'
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'
import { EventEmitter } from 'node:events'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_DIR = path.join(os.homedir(), '.ros/log')

const app = new Hono()
const events = new EventEmitter()

// Monitor LOG_DIR for changes - Optimized (Problem 1 Performance)
const watcher = chokidar.watch([
  path.join(LOG_DIR, '**/*.log'),
  path.join(LOG_DIR, '*/launch.log')
], {
  persistent: true,
  ignoreInitial: true,
  depth: 2,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100
  },
  ignored: /(^|[\/\\])\../ // ignore dotfiles
})

watcher.on('all', (event, filePath) => {
  events.emit('change', { event, path: filePath })
})

// Log Parser Utility
class LogParser {
  static async getSessions() {
    if (!(await fs.pathExists(LOG_DIR))) return []
    const items = await fs.readdir(LOG_DIR)
    const sessions = []
    for (const name of items) {
      const fullPath = path.join(LOG_DIR, name)
      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        sessions.push({
          id: name,
          mtime: stats.mtime,
          path: fullPath
        })
      }
    }
    return sessions.sort((a, b) => b.mtime - a.mtime)
  }

  static async getSessionLogs(sessionId, filters = {}) {
    const sessionPath = path.join(LOG_DIR, sessionId)
    if (!(await fs.pathExists(sessionPath))) return { logs: [], total: 0, modules: [] }

    const launchLogPath = path.join(sessionPath, 'launch.log')
    const pids = new Set()
    const nodeMapping = {} // PID -> NodeName

    if (await fs.pathExists(launchLogPath)) {
      const content = await fs.readFile(launchLogPath, 'utf-8')
      const lines = content.split('\n')
      for (const line of lines) {
        const match = line.match(/\[(.*?)\]: process started with pid \[(.*?)\]/)
        if (match) {
          const nodeName = match[1].split('-')[0]
          const pid = match[2]
          pids.add(pid)
          nodeMapping[pid] = nodeName
        }
      }
    }

    const allLogFiles = await fs.readdir(LOG_DIR)
    const sessionLogFiles = []
    for (const file of allLogFiles) {
      if (file.endsWith('.log')) {
        for (const pid of pids) {
          if (file.includes(`_${pid}_`)) {
            sessionLogFiles.push({
              path: path.join(LOG_DIR, file),
              nodeName: nodeMapping[pid] || file.split(`_${pid}_`)[0]
            })
            break
          }
        }
      }
    }

    sessionLogFiles.push({ path: launchLogPath, nodeName: 'launch' })

    let allLogs = []
    for (const fileObj of sessionLogFiles) {
      if (await fs.pathExists(fileObj.path)) {
        const content = await fs.readFile(fileObj.path, 'utf-8')
        const lines = content.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = this.parseLogLine(line, fileObj.nodeName)
          if (parsed) allLogs.push(parsed)
        }
      }
    }

    allLogs.sort((a, b) => a.timestamp - b.timestamp)

    // Aggregate modules BEFORE filtering as requested (Problem 3)
    const allModules = Array.from(new Set(allLogs.map(l => l.module)))

    // Apply filters
    let filteredLogs = allLogs
    if (filters.level) {
      filteredLogs = filteredLogs.filter(l => l.level === filters.level)
    }
    if (filters.module) {
      filteredLogs = filteredLogs.filter(l => l.module === filters.module)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const isRegex = filters.isRegex === 'true'
      
      if (isRegex) {
        try {
          const regex = new RegExp(filters.search, 'i')
          filteredLogs = filteredLogs.filter(l => regex.test(l.message) || regex.test(l.module))
        } catch (e) {
          // If invalid regex, fallback to normal search or return empty
          console.error('Invalid Regex:', e.message)
        }
      } else {
        filteredLogs = filteredLogs.filter(l => l.message.toLowerCase().includes(search) || l.module.toLowerCase().includes(search))
      }
    }

    const total = filteredLogs.length
    const page = parseInt(filters.page) || 1
    const limit = parseInt(filters.limit) || 100
    const offset = (page - 1) * limit
    const paginatedLogs = filteredLogs.slice(offset, offset + limit)

    return { logs: paginatedLogs, total, modules: allModules }
  }

  static parseLogLine(line, defaultModule) {
    const nodeMatch = line.match(/^\[(DEBUG|INFO|WARN|ERROR|FATAL)\]\s+\[([\d.]+)\]\s+\[(.*?)\]:\s+(.*)$/)
    if (nodeMatch) {
      return {
        level: nodeMatch[1],
        timestamp: parseFloat(nodeMatch[2]),
        module: nodeMatch[3],
        message: nodeMatch[4]
      }
    }

    const launchMatch = line.match(/^([\d.]+)\s+\[(DEBUG|INFO|WARN|ERROR|FATAL)\]\s+\[(.*?)\]:\s+(.*)$/)
    if (launchMatch) {
      return {
        level: launchMatch[2],
        timestamp: parseFloat(launchMatch[1]),
        module: launchMatch[3],
        message: launchMatch[4]
      }
    }

    return null
  }
}

// API Endpoints
app.get('/api/events', (c) => {
  return streamSSE(c, async (stream) => {
    const listener = (data) => {
      stream.writeSSE({
        data: JSON.stringify(data),
        event: 'log-change'
      })
    }
    events.on('change', listener)
    
    stream.onAbort(() => {
      events.off('change', listener)
    })

    while (true) {
      await stream.sleep(30000)
      await stream.writeSSE({ data: 'heartbeat', event: 'ping' })
    }
  })
})

app.get('/api/sessions', async (c) => {
  const sessions = await LogParser.getSessions()
  return c.json(sessions)
})

app.get('/api/sessions/:id/logs', async (c) => {
  const id = c.req.param('id')
  const filters = {
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    level: c.req.query('level'),
    module: c.req.query('module'),
    search: c.req.query('search'),
    isRegex: c.req.query('isRegex')
  }
  const result = await LogParser.getSessionLogs(id, filters)
  return c.json(result)
})

app.delete('/api/sessions/:id', async (c) => {
  const id = c.req.param('id')
  const sessionPath = path.join(LOG_DIR, id)
  
  if (await fs.pathExists(sessionPath)) {
    const launchLogPath = path.join(sessionPath, 'launch.log')
    if (await fs.pathExists(launchLogPath)) {
      const content = await fs.readFile(launchLogPath, 'utf-8')
      const pids = [...content.matchAll(/process started with pid \[(.*?)\]/g)].map(m => m[1])
      
      const allFiles = await fs.readdir(LOG_DIR)
      for (const file of allFiles) {
        for (const pid of pids) {
          if (file.includes(`_${pid}_`)) {
            await fs.remove(path.join(LOG_DIR, file))
          }
        }
      }
    }
    await fs.remove(sessionPath)
  }
  
  return c.json({ success: true })
})

app.delete('/api/logs', async (c) => {
  if (await fs.pathExists(LOG_DIR)) {
    const items = await fs.readdir(LOG_DIR)
    for (const item of items) {
      await fs.remove(path.join(LOG_DIR, item))
    }
  }
  return c.json({ success: true })
})

const distPath = path.resolve(__dirname, '../frontend/dist')
app.use('/*', serveStatic({ root: path.relative(process.cwd(), distPath) }))
app.get('/*', serveStatic({ path: path.join(path.relative(process.cwd(), distPath), 'index.html') }))

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
