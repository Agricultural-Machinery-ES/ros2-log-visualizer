<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import LogViewer from './lib/components/LogViewer.svelte';
  import { fetchSessions, fetchLogs, deleteSession, deleteAllLogs } from './lib/api';
  import type { Session, LogEntry } from './lib/types';
  import './app.css';

  // State using Svelte 5 runes
  let sessions = $state<Session[]>([]);
  let activeSessionId = $state<string | null>(null);
  let logs = $state<LogEntry[]>([]);
  let total = $state(0);
  let modules = $state<string[]>([]);
  let loading = $state(false);
  
  // Resizable Layout (Problem 4)
  let sidebarWidth = $state(320);
  let isResizing = $state(false);

  let filters = $state({
    level: [] as string[],
    module: [] as string[],
    search: '',
    isRegex: false,
    page: 1,
    limit: 100
  });

  async function loadSessions() {
    sessions = await fetchSessions();
    if (sessions.length > 0 && !activeSessionId) {
      activeSessionId = sessions[0].id;
    }
  }

  async function loadLogs(append = false) {
    if (!activeSessionId) return;
    loading = true;
    try {
      const result = await fetchLogs(activeSessionId, filters);
      if (append) {
        logs = [...logs, ...result.logs];
      } else {
        logs = result.logs;
      }
      total = result.total;
      modules = result.modules;
    } catch (e) {
      console.error('Failed to load logs', e);
    } finally {
      loading = false;
    }
  }

  let prevSessionId = $state<string | null>(null);

  // Effect to reload logs when filters or active session change
  $effect(() => {
    // Explicitly track these dependencies
    const currentSessionId = activeSessionId;
    
    if (currentSessionId !== untrack(() => prevSessionId)) {
      untrack(() => {
        filters.level = [];
        filters.module = [];
        prevSessionId = currentSessionId;
      });
    }

    filters.level;
    filters.module;
    filters.search;
    filters.isRegex;
    
    // Use untrack to prevent filters.page change from re-triggering this effect
    untrack(() => {
      filters.page = 1;
      loadLogs(false);
    });
  });

  // Watch page change specifically for loading more
  $effect(() => {
    const page = filters.page;
    if (page > 1) {
      untrack(() => loadLogs(true));
    }
  });

  onMount(() => {
    loadSessions();

    // SSE for real-time updates (Problem 1)
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('log-change', (e) => {
      // Refresh sessions list
      loadSessions();
      // If the change might affect current logs, reload them too
      if (activeSessionId) loadLogs(false);
    });

    return () => eventSource.close();
  });

  async function handleDeleteSession(id: string) {
    if (confirm(`Are you sure you want to delete session ${id}?`)) {
      await deleteSession(id);
      if (activeSessionId === id) activeSessionId = null;
      loadSessions();
    }
  }

  async function handleDeleteAll() {
    if (confirm('Are you sure you want to delete ALL logs? This cannot be undone.')) {
      await deleteAllLogs();
      activeSessionId = null;
      sessions = [];
      logs = [];
      total = 0;
    }
  }

  function handleLoadMore() {
    filters.page += 1;
  }

  // Resize Handlers
  function startResize(e: MouseEvent) {
    isResizing = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth > 150 && newWidth < 800) {
      sidebarWidth = newWidth;
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = 'default';
  }
</script>

<div class="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100"
     class:pointer-events-none={isResizing}>
  <div style="width: {sidebarWidth}px" class="flex-shrink-0 flex select-none">
    <Sidebar 
      {sessions} 
      {activeSessionId}
      onSelect={(id) => { activeSessionId = id; }}
      onDelete={handleDeleteSession}
      onDeleteAll={handleDeleteAll}
    />
  </div>

  <!-- Draggable Divider (Problem 4) -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    role="separator"
    tabindex="-1"
    onmousedown={startResize}
    class="w-1.5 hover:w-2 bg-gray-800 hover:bg-blue-600 cursor-col-resize transition-all active:bg-blue-500 z-10 flex-shrink-0"
  ></div>

  <div class="flex-1 min-w-0">
    {#if activeSessionId}
      <LogViewer 
        {logs} 
        {total} 
        {modules} 
        bind:filters 
        onLoadMore={handleLoadMore}
        {loading}
      />
    {:else}
      <div class="h-full flex flex-col items-center justify-center text-gray-600 select-none">
        <div class="w-16 h-16 border-4 border-gray-800 border-t-blue-600 rounded-full animate-spin mb-4" class:hidden={!loading && sessions.length > 0}></div>
        <p class="text-xl">Select a session to view logs</p>
        {#if sessions.length === 0 && !loading}
          <p class="mt-2 text-sm">No ROS 2 logs found in ~/.ros/log</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }
</style>
