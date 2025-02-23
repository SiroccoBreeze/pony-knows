export const themeScript = `
if (typeof window !== 'undefined') {
  let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = localStorage.getItem('theme') || (isDark ? 'dark' : 'light');
  let colorTheme = localStorage.getItem('color-theme') || 'zinc';
  
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.setAttribute('data-theme', colorTheme);
}
` 