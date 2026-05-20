<script lang="ts">
  import type { Session } from '../types';
  import { Trash2, Folder, Clock } from '@lucide/svelte';
  import dayjs from 'dayjs';

  let { sessions, activeSessionId, onSelect, onDelete, onDeleteAll } = $props<{
    sessions: Session[];
    activeSessionId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onDeleteAll: () => void;
  }>();
</script>

<aside class="w-full h-screen bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800">
  <div class="p-4 border-b border-gray-800 flex justify-between items-center">
    <h2 class="text-xl font-bold flex items-center gap-2">
      <Folder class="w-5 h-5" />
      ROS 2 Logs
    </h2>
    <button 
      onclick={onDeleteAll}
      class="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors title='Delete All Logs'"
    >
      <Trash2 class="w-5 h-5" />
    </button>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-1">
    {#each sessions as session (session.id)}
      <div
        role="button"
        tabindex="0"
        onclick={() => onSelect(session.id)}
        onkeydown={(e) => e.key === 'Enter' && onSelect(session.id)}
        class="w-full text-left p-3 rounded-lg transition-all flex flex-col gap-1 group cursor-pointer
          {activeSessionId === session.id 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'hover:bg-gray-800 text-gray-400'}"
      >
        <div class="flex justify-between items-start">
          <span class="font-medium truncate flex-1">{session.id}</span>
          <button
            onclick={(e) => { e.stopPropagation(); onDelete(session.id); }}
            class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded text-white transition-opacity"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="flex items-center gap-1.5 text-xs {activeSessionId === session.id ? 'text-blue-100' : 'text-gray-500'}">
          <Clock class="w-3 h-3" />
          {dayjs(session.mtime).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>
    {/each}
  </div>
</aside>
