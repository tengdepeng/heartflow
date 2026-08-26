import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTimerStore } from './timer'
import { useAdvisorStore } from './advisor'

export const useRuntimeStore = defineStore('runtime', () => {
  const isSanctuaryActive = ref(false)

  function enterSanctuary() {
    if (isSanctuaryActive.value) return
    isSanctuaryActive.value = true

    const timerStore = useTimerStore()
    const advisorStore = useAdvisorStore()

    timerStore.pauseForSanctuary()
    advisorStore.pauseForSanctuary()
  }

  function exitSanctuary() {
    if (!isSanctuaryActive.value) return

    const timerStore = useTimerStore()
    const advisorStore = useAdvisorStore()

    isSanctuaryActive.value = false
    advisorStore.resumeFromSanctuary()
    timerStore.resumeFromSanctuary()
  }

  return {
    isSanctuaryActive,
    enterSanctuary,
    exitSanctuary,
  }
})
