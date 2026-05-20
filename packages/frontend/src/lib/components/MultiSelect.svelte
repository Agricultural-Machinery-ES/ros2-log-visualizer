<script lang="ts">
  import { onMount } from 'svelte';
  import { Filter } from '@lucide/svelte';

  let { options, value = $bindable([]), placeholder = "Select..." } = $props<{
    options: string[];
    value: string[];
    placeholder?: string;
  }>();

  let isOpen = $state(false);
  let container: HTMLDivElement;

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function toggleOption(opt: string) {
    if (value.includes(opt)) {
      value = value.filter(v => v !== opt);
    } else {
      value = [...value, opt];
    }
  }

  onMount(() => {
    function handleClickOutside(event: MouseEvent) {
      if (container && !container.contains(event.target as Node)) {
        isOpen = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });
</script>

<div class="relative min-w-[140px]" bind:this={container}>
  <button
    class="flex items-center justify-between w-full h-[38px] px-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    onclick={toggleDropdown}
  >
    <span class="truncate">
      {#if value.length === 0}
        {placeholder}
      {:else if value.length === 1}
        {value[0]}
      {:else}
        {value.length} selected
      {/if}
    </span>
    <Filter size={16} class="text-gray-500" />
  </button>

  {#if isOpen}
    <div class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      <div class="p-1 space-y-1">
        {#each options.length > 0 ? options : ['No options'] as opt}
          <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-100">
            {#if options.length > 0}
              <input
                type="checkbox"
                class="rounded bg-gray-900 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                checked={value.includes(opt)}
                onchange={() => toggleOption(opt)}
              />
            {/if}
            <span class="truncate">{opt}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>
