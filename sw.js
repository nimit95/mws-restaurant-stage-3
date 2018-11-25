
importScripts('js/idb.js')
importScripts('js/dbhelper.js')

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
        return fetch(event.request).then(function(site_response){
          caches.put(request, site_response.clone());
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

self.addEventListener('sync', function(event) {
  if (event.tag == 'sync-reviews') {
    console.log('Started syncing')
    event.waitUntil(
      new Promise((resolve, reject) => {
        idb.open('restaurant_review').then(db => {
          let tx = db.transaction('reviews', 'readwrite');
          let store = tx.objectStore('reviews');
    
          return store.openCursor();
        }).then(function sendBacklogReview(cursor) {
          if(!cursor) return;
          
          console.log('review is ', cursor.value);
          let reviewObj = cursor.value;
          cursor.delete();
          DBHelper.sendReview(reviewObj).then(response => {
            if(!response) {
              console.log('couldnt add, data lost'); 
            }
          })
          return cursor.continue().then(sendBacklogReview);
          
        }).then(() => {
          console.log('All synced');
          resolve()
          return true;
        })
        .catch(err => {
          console.log('error syncing', err);
          reject();
        })
      })
    );
  }
});
