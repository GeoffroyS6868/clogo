<script setup lang="ts">
const { logo, ready, canUndo, canRedo, patch, toggleShape, setColor, load, reset, shuffle, undo, redo } = useLogo()
const { designs, flash, saved, full, save, remove } = useDesigns()

// A field with its own undo: the shortcuts leave it alone
function isTextField(el: EventTarget | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return el.type !== 'color' && el.type !== 'range'
  return el instanceof HTMLElement && el.isContentEditable
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.altKey || isTextField(event.target)) return
  const mod = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (mod && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
  } else if (event.ctrlKey && key === 'y') {
    event.preventDefault()
    redo()
  } else if (mod && key === 's') {
    // Not the browser's "save page"
    event.preventDefault()
    if (!event.repeat) save(logo.value)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <main class="relative h-dvh overflow-hidden bg-default">
    <LogoCanvas
      :logo="logo"
      :ready="ready"
    />
    <LogoControls
      :logo="logo"
      :designs="designs"
      :flash="flash"
      :saved="saved"
      :full="full"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @patch="patch"
      @toggle-shape="toggleShape"
      @set-color="setColor"
      @undo="undo"
      @redo="redo"
      @shuffle="shuffle"
      @reset="reset"
      @save="save(logo)"
      @load="load"
      @remove="remove"
    />
  </main>
</template>
