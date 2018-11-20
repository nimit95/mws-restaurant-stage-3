
navigator.serviceWorker.register('sw.js').then(reg => {
  console.log('Service Worker Registration Successful: ' + reg.scope);
})
.catch(error => {
  console.log('Service Worker Registration Failed: ' + error);
});