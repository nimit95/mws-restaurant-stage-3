let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  document.getElementById("submitReview").onclick = reviewSubmit;
});
var myLazyLoad = new LazyLoad({
  elements_selector: ".lazy"
});


checkAndMarkFavToggle = (restaurant) => {
  console.log(restaurant);
  document.getElementById("markFav").checked = restaurant.is_favorite === "true"
}

changeFavState = (toggle) => { 
  console.log(toggle.checked);
  DBHelper.setRestaurantFavById(self.restaurant.id, toggle.checked)
  .then(data => {
    console.log(JSON.stringify(data))
    DBHelper.deleteRestaurantCacheById(self.restaurant.id);
  }) // JSON-string from `response.json()` call
  .catch(error => console.error(error));
}


/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoibmFuZHViaGFpNzg5IiwiYSI6ImNqazVjdHQ0ejBpbXgzdnA2NmdyZXBvOXIifQ.bTzSXgZd1ucBfJmZRR44CQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
      checkAndMarkFavToggle(self.restaurant); 
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }

      DBHelper.fetchReviewsById(id).then(reviews => {
        console.log(reviews);
        self.restaurant.reviews = reviews;
        fillRestaurantHTML();
        myLazyLoad.update();
        callback(null, restaurant)
      }).catch(err => {
        console.log(err);
      })
      
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img lazy'

  let baseImgUrl = DBHelper.imageUrlForRestaurant(restaurant);
  let imagName = baseImgUrl.split(".jpg")[0];

  let image350 = `${imagName}_350.jpg`;
  let image550 = `${imagName}_550.jpg`;
  let image860 = `${imagName}_860.jpg`;

  image.setAttribute('data-src', image350);  //fallback image

  image.setAttribute('data-srcset', `${image350} 350w, ${image550} 550w, ${image860} 860w`);
  image.setAttribute('data-sizes', `(max-width: 500px) 350px, (max-width: 960px) 550px, 860px`);
  // image.sizes = `(max-width: 500px) 350px, (max-width: 960px) 550px, 860px`
  // image.srcset = `${image350} 350w, ${image550} 550w, ${image860} 860w`
  image.alt = `This is image of ${restaurant.name}`;
  
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = "";
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  // const date = document.createElement('p');
  // date.innerHTML = review.date;
  // li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

reviewSubmit = (e) => {

  e.preventDefault();
  let name = document.getElementById("name").value;
  let rating = document.getElementById("rating").value;
  let comments = document.getElementById("comments").value;

  if(!name || !rating || !comments || isNaN(rating)) {
    document.getElementById('formResult').style.display = "inline";
    return;
  } else {
    console.log('Submit data')
    //document.getElementById('formResult').style.display = "none";
    
    DBHelper.sendReview({
      "restaurant_id": self.restaurant.id,
      "name": name,
      "rating": rating,
      "comments": comments
    }).then(response => {
      if(!response) return;
      console.log('sent, response is ' ,response);
      return DBHelper.fetchReviewsById(self.restaurant.id)
    }).then(reviews => {
      if(!reviews) return;
      self.restaurant.reviews = reviews;
      fillReviewsHTML()

      
      document.getElementById("name").value = '';
      document.getElementById("rating").value = '';
      document.getElementById("comments").value = '';
      
    })
  }

}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
var myLazyLoad = new LazyLoad({
  elements_selector: ".lazy"
});
