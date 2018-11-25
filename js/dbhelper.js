/**
 * Common database helper functions.
 */


class DBHelper {


  

  constructor() {
    this.dbPromise = null;
  } 

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static openDB() {
    if(this.dbPromise) {
      return this.dbPromise;
    } else {
      this.dbPromise = idb.open('restaurant_review', 2, upgradeDb => {
        let store = upgradeDb.createObjectStore('restaurants', {
          keyPath: 'id'
        });
        let store2 = upgradeDb.createObjectStore('restaurant',  {
          keyPath: 'id'
        });

        let store3 = upgradeDb.createObjectStore('reviews');
        
        store.createIndex('id', 'id');
        store2.createIndex('id', 'id');
      })
      
      return this.dbPromise;
    }
    
  }
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    this.openDB().then(db => {
      console.log(db);
      let tx = db.transaction('restaurants');
      return tx.objectStore('restaurants').getAll();
    }).then(restaurants => {
      console.log('index db got -->', restaurants);
      if(restaurants.length === 0) {
        //fetch restaurants 
        console.log('from internet');
        let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.DATABASE_URL);
        xhr.onload = () => {
          if (xhr.status === 200) { // Got a success response from server!
            // console.log("**************", xhr.responseText)
            const json = JSON.parse(xhr.responseText);
            console.log(json);
            // const restaurants = json.restaurants;
            callback(null, json);
            //store for future as well
            this.openDB().then(db => {
              if(!db) return;
              let tx = db.transaction('restaurants', 'readwrite');
              let store = tx.objectStore('restaurants');
              json.forEach(restaurant=> {
                store.put(restaurant);
              })
              return tx.complete;
            }).then(function() { // successfully added restaurants to IndexDB
              
              console.log("Restaurants added to Index DB successfully")

            }).catch(function(error) { // failed adding restaurants to IndexDB
              
              console.log(error)

            })
          
          } else { // Oops!. Got an error from server.
            const error = (`Request failed. Returned status of ${xhr.status}`);
            callback(error, null);
          }
        };
        
        xhr.send();
      } else {
        console.log('from idb');
        callback(null, restaurants);
      }
    })
    
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.

    this.openDB().then(db => {
      let tx = db.transaction('restaurant');
      let store = tx.objectStore('restaurant');

      return store.get(parseInt(id));
    }).then(restaurant => {
        console.log('index db got -->', restaurant);
        if(restaurant) {
          console.log('from index db')
          callback(null, restaurant);
        } else {
          console.log('from internet')
          let xhr = new XMLHttpRequest();
          xhr.open('GET', DBHelper.DATABASE_URL + `/${id}`);

          xhr.onload = () => {
            if(xhr.status === 200) {
              
              if(xhr.responseText !== "") {
                const restaurant = JSON.parse(xhr.responseText);
                callback(null, restaurant);

                this.openDB().then(db => {
                  if(!db) return 
                  
                  let tx = db.transaction('restaurant', 'readwrite');
                  let store = tx.objectStore('restaurant');

                  store.put(restaurant);
                })

              } else {
                callback('Restaurant does not exist', null);
              }
            } else {
              const error = (`Request failed. Returned status of ${xhr.status}`);
              callback(error, null);
            }
          };
          xhr.send();
        }
    });
    


    // DBHelper.fetchRestaurantByIdXhr((error, restaurant) => {
    //   if (error) {
    //     callback(error, null);
    //   } else {
    //     const restaurant = restaurants.find(r => r.id == id);
    //     if (restaurant) { // Got the restaurant
    //       callback(null, restaurant);
    //     } else { // Restaurant does not exist in the database
    //       callback('Restaurant does not exist', null);
    //     }
    //   }
    // });
  }

  static fetchReviewsById(id) {
    if(!id) return callback("no id", null);
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
    .then(response => {
      return response.json()
    }).catch(err => {
      console.log(err);
    })
  }

  static setRestaurantFavById(id, favState) {
    return DBHelper.putData(`http://localhost:1337/restaurants/${id}/?is_favorite=${favState}`, {})
  }

  static sendReview(data) {
    return DBHelper.postData(`http://localhost:1337/reviews/`, data)
  }

  static postData(url = ``, data = {}) {
    // Default options are marked with *
      return fetch(url, {
          method: "POST", // *GET, POST, PUT, DELETE, etc.
          body: JSON.stringify(data), // body data type must match "Content-Type" header
      })
      .then(response => {
        console.log(response);
        return response.json()
      }).catch(err => {
        console.log('Some error', err);
        DBHelper.addReviewToDb(data);
        return null;
      })
  }

  static putData(url = ``, data = {}) {
    // Default options are marked with *
      return fetch(url, {
          method: "PUT", // *GET, POST, PUT, DELETE, etc.
          mode: "cors", // no-cors, cors, *same-origin
          cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
          credentials: "same-origin", // include, *same-origin, omit
          headers: {
              "Content-Type": "application/json; charset=utf-8",
              // "Content-Type": "application/x-www-form-urlencoded",
          },
          redirect: "follow", // manual, *follow, error
          referrer: "no-referrer", // no-referrer, *client
          body: JSON.stringify(data), // body data type must match "Content-Type" header
      })
      .then(response => response.json()); // parses response to JSON
  }

  static manageCaches() { 
    setInterval(() => {
      // delete indexDB cache regularly to get new data
      console.log('clearing cache')
      DBHelper.deleteRestaurantsCache();
      DBHelper.deleteRestaurantCache();
    }, 60 * 30 * 1000);
  }


  static deleteRestaurantsCache() {
    this.openDB().then(db => {
      if(!db) return;

      let tx = db.transaction('restaurants', 'readwrite');
      let store = tx.objectStore('restaurants');

      return store.openCursor();
    }).then(function deleteRestaurants(cursor) {
      if(!cursor) return;
      cursor.delete();

      return cursor.continue().then(deleteRestaurants);
    }).then(() => {
      console.log(' Restaurants cache cleared');
    })
  }

  static deleteRestaurantCache() {
    this.openDB().then(db => {
      if(!db) return;

      let tx = db.transaction('restaurant', 'readwrite');
      let store = tx.objectStore('restaurant');

      return store.openCursor();
    }).then(function deleteRestaurant(cursor) {
      if(!cursor) return;
      cursor.delete();

      return cursor.continue().then(deleteRestaurant);
    }).then(() => {
      console.log(' Restaurant cache cleared');
    })
  }

  static deleteRestaurantCacheById(id) {
    this.openDB().then(db => {
      if(!db) return;

      let tx = db.transaction('restaurant', 'readwrite');
      let store = tx.objectStore('restaurant');

      store.delete(id);

      
    }).then(() => {
      console.log(' Restaurant cache cleared');
    })
  }
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`../images/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 

  static syncReviewsInDb() {
    return this.openDB().then(db => {
      if(!db) return;
      
      let tx = db.transaction('reviews', 'readwrite');
      let store = tx.objectStore('reviews');

      return store.openCursor();
    }).then(function synRestaurant(cursor) {
      if(!cursor) return;
      
      console.log('review is ', cursor.value);
      DBHelper.sendReview(cursor.value).then(response => {
        if(response) {
          cursor.delete();
        }
        return cursor.continue().then(synRestaurant);
      })
      
    }).then(() => {
      console.log('All synced');
      return true;
    })
  }

  static addReviewToDb(review) {
    this.openDB(db => {
      if(!db) return;
      console.log('Adding to db', review);
      let tx = db.transaction('reviews', 'readwrite');
      let store = tx.objectStore('reviews');

      store.put(review);

      return tx.complete
    })
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

