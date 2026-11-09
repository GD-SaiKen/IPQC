import { ref } from 'vue'

const pageTitle = ref('')

export function usePageTitle() {
  function setPageTitle(text: string): void {
    pageTitle.value = text
  }

  return { pageTitle, setPageTitle }
}
