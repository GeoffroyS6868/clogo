// True while a bar is being dragged: the logo then follows the pointer without transitions,
// which would otherwise restart on every move and lag behind it
export function useScrub() {
  const scrubbing = useState('scrubbing', () => false)

  function stop() {
    scrubbing.value = false
  }

  function start() {
    scrubbing.value = true
    window.addEventListener('pointerup', stop, { once: true })
    window.addEventListener('pointercancel', stop, { once: true })
  }

  return { scrubbing, start }
}
