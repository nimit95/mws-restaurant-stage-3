

let cacheName = 'restaurant-sw-v'
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll([
        '/',
        '/restaurant.html',
        'css/styles.css',
        'css/responsive.css',
        'js/dbhelper.js',
        'js/main.js',
        'js/restaurant_info.js',
        'js/idb.js',
        'js/registerSW.js',
        'images/1.jpg',
        'images/2.jpg',
        'images/3.jpg',
        'images/4.jpg',
        'images/5.jpg',
        'images/6.jpg',
        'images/7.jpg',
        'images/8.jpg',
        'images/9.jpg',
        'images/10.jpg',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js'
      ]);
    }).catch( e => {
      console.log(e);
    })
  );
});


self.addEventListener('activate', event => {
  // event.waitUntil(
  //     caches.keys().then( cacheNames =>  {
  //         return Promise.all(
  //             cacheNames.filter(tempCacheName => {
  //                 return tempCacheName != cacheName;
  //             }).map(cacheName => {
  //                 return caches.delete(cacheName);
  //             })
  //         );
  //     })
  // );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request,  {'ignoreSearch': true}).then(function(response) {
      console.log('resp  -->s', response, event.request);
      if(response) return response;
      if(event.request && event.request.url.includes("restaurant.html")) {
        console.log('caching this rest page')
        return fetch(request).then(function(site_response){
          cache.put(request, site_response.clone());
          return site_response
        })
      } else {
        return fetch(event.request)
      }
    }).catch( e => {
      console.log(e);
    })
  );
});