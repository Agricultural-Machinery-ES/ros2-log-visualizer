<script lang="ts">
  import type { LogEntry } from '../types';
  import { Search, Filter, ChevronDown, ListFilter, Regex } from '@lucide/svelte';
  import dayjs from 'dayjs';

  let { logs, total, modules, filters = $bindable(), onLoadMore, loading } = $props<{
    logs: LogEntry[];
    total: number;
    modules: string[];
    filters: { level: string; module: string; search: string; page: number; isRegex: boolean };
    onLoadMore: () => void;
    loading: boolean;
  }>();

  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

  function getLevelClass(level: string) {
    switch (level) {
      case 'DEBUG': return 'text-gray-400 bg-gray-800/50';
      case 'INFO': return 'text-blue-400 bg-blue-900/20';
      case 'WARN': return 'text-yellow-400 bg-yellow-900/20';
      case 'ERROR': return 'text-red-400 bg-red-900/20';
      case 'FATAL': return 'text-red-600 bg-red-900/40 font-bold';
      default: return 'text-gray-300';
    }
  }

  function formatTimestamp(ts: number) {
    // ROS timestamps are unix seconds with decimals
    return dayjs(ts * 1000).format('HH:mm:ss.SSS');
  }
</script>

<div class="flex-1 flex flex-col h-screen bg-gray-950 overflow-hidden">
  <!-- Toolbar -->
  <div class="p-4 bg-gray-900 border-b border-gray-800 flex gap-4 items-center flex-wrap">
    <div class="relative flex-1 min-w-[200px]">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder={filters.isRegex ? "Search with regex..." : "Search logs..."}
        bind:value={filters.search}
        class="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-12 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
      />
      <button
        onclick={() => filters.isRegex = !filters.isRegex}
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors {filters.isRegex ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-500'}"
        title="Toggle Regex Mode"
      >
        <Regex class="w-4 h-4" />
      </button>
    </div>

    <div class="flex gap-2">
      <div class="relative">
        <select
          bind:value={filters.level}
          class="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
        >
          <option value="">All Levels</option>
          {#each levels as level}
            <option value={level}>{level}</option>
          {/each}
        </select>
        <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>

      <div class="relative">
        <select
          bind:value={filters.module}
          class="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
        >
          <option value="">All Modules</option>
          {#each modules as mod}
            <option value={mod}>{mod}</option>
          {/each}
        </select>
        <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>
    </div>

    <div class="text-xs text-gray-500 ml-auto">
      Showing {logs.length} of {total} logs
    </div>
  </div>

  <!-- Log Table -->
  <div class="flex-1 overflow-auto font-mono text-sm">
    <table class="w-full border-collapse">
      <thead class="sticky top-0 bg-gray-900 text-gray-400 text-left border-b border-gray-800">
        <tr>
          <th class="p-2 font-medium w-32">Time</th>
          <th class="p-2 font-medium w-24">Level</th>
          <th class="p-2 font-medium w-48">Module</th>
          <th class="p-2 font-medium">Message</th>
        </tr>
      </thead>
      <tbody>
        {#each logs as log, i (i)}
          <tr class="border-b border-gray-900/50 hover:bg-gray-800/30 transition-colors">
            <td class="p-2 text-gray-500 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
            <td class="p-2">
              <span class="px-2 py-0.5 rounded text-[10px] uppercase {getLevelClass(log.level)}">
                {log.level}
              </span>
            </td>
            <td class="p-2 text-blue-400/80 truncate max-w-[12rem]">{log.module}</td>
            <td class="p-2 text-gray-300 break-all select-text cursor-auto">{log.message}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if logs.length < total}
      <div class="p-8 flex justify-center">
        <button
          onclick={onLoadMore}
          disabled={loading}
          class="px-6 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-full text-sm transition-colors border border-gray-700"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    {/if}

    {#if logs.length === 0 && !loading}
      <div class="p-20 text-center text-gray-600">
        <ListFilter class="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No logs found matching your criteria</p>
      </div>
    {/if}
  </div>
</div>
