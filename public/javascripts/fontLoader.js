(function() {
  document.documentElement.classList.add('font-loading');
  Promise.race([
    document.fonts.ready,
    new Promise(resolve => setTimeout(resolve, 3000))
  ]).then(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('font-loading');
      document.documentElement.classList.add('fonts-loaded');
    });
  }).catch(() => {
    document.documentElement.classList.remove('font-loading');
    document.documentElement.classList.add('fonts-loaded');
  });
})(); 