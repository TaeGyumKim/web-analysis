import { ref, watch, onMounted } from 'vue';

const isDarkMode = ref(false);

export function useDarkMode() {
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;

    // Save to localStorage
    if (process.client) {
      localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false');
      updateDOMClasses();
    }
  };

  const setDarkMode = (value: boolean) => {
    isDarkMode.value = value;

    if (process.client) {
      localStorage.setItem('darkMode', value ? 'true' : 'false');
      updateDOMClasses();
    }
  };

  const updateDOMClasses = () => {
    if (process.client) {
      if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const initDarkMode = () => {
    if (process.client) {
      // Check localStorage first
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        isDarkMode.value = saved === 'true';
      } else {
        // Check system preference
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      updateDOMClasses();

      // Listen for system preference changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // Only update if user hasn't manually set preference
        if (localStorage.getItem('darkMode') === null) {
          isDarkMode.value = e.matches;
          updateDOMClasses();
        }
      });
    }
  };

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    initDarkMode
  };
}
