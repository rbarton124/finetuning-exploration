// public/javascripts/ItinPage.js

document.addEventListener('DOMContentLoaded', function() {
  // Initialize animations
  AOS.init({
    duration: 800,
    easing: 'ease-out',
    once: true
  });
  
  // Check if itinerary data exists
  var localthingy = sessionStorage.getItem("itinerary");
  if (!localthingy) {
    Swal.fire({
      title: 'No Itinerary Found',
      text: 'Please generate an itinerary first.',
      icon: 'warning',
      confirmButtonText: 'Go to Homepage',
      confirmButtonColor: '#0688f0'
    }).then(() => {
      window.location.href = "/";
    });
    return;
  }
  
  console.log(localthingy);
  var itin = JSON.parse(localthingy);
  
  // Render the destination, start date, and end date
  const destinationEl = document.getElementById('destination');
  destinationEl.innerText = itin.destination;
  
  const datesEl = document.getElementById('dates');
  datesEl.innerText = `${itin.start_date} - ${itin.end_date}`;
  
  // Render the mode of transportation and flight details with nicer formatting
  const transportEl = document.getElementById('transportation');
  transportEl.innerHTML = `<strong>${itin.travel.mode_of_transportation}</strong>`;
  
  const flightDetailsEl = document.getElementById('flight-details');
  flightDetailsEl.innerHTML = `Arrival: <strong>${itin.travel.travel_details.arrival_date} ${itin.travel.travel_details.arrival_time}</strong><br>Departure: <strong>${itin.travel.travel_details.departure_date} ${itin.travel.travel_details.departure_time}</strong>`;
  
  // Render the hotel details with improved formatting
  const hotelEl = document.getElementById('hotel');
  hotelEl.innerHTML = itin.travel.hotel.name;
  
  const checkInEl = document.getElementById('check-in');
  checkInEl.innerHTML = `Check-in: <strong>${itin.travel.hotel.check_in_date}</strong>`;
  
  const checkOutEl = document.getElementById('check-out');
  checkOutEl.innerHTML = `Check-out: <strong>${itin.travel.hotel.check_out_date}</strong>`;

  // Function to fetch images for the itinerary
  function fetchImages(query, searchType) {
    return fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, searchType }),
    })
      .then(response => response.json())
      .catch(error => {
        console.error('Error:', error);
      });
  }

  // Fetch and render hero image
  const heroQuery = itin.destination + " skyline panorama gorgeous";
  fetchImages(heroQuery, 'image')
    .then(data => {
      if (data && data.items && data.items[0]) {
        const heroImage = data.items[0].link;
        const heroEl = document.querySelector('.destination-hero-image');
        heroEl.style.backgroundImage = `url(${heroImage})`;
        heroEl.style.backgroundSize = 'cover';
        heroEl.style.backgroundPosition = 'center';
      }
    });

  // Fetch transportation image
  const transportQuery = itin.travel.mode_of_transportation + " interior, traveling, window, luxury";
  fetchImages(transportQuery, 'image')
    .then(data => {
      if (data && data.items && data.items[0]) {
        const transportImage = data.items[0].link;
        const transportEl = document.querySelector('.transportation-image');
        transportEl.style.backgroundImage = `url(${transportImage})`;
        transportEl.style.backgroundSize = 'cover';
        transportEl.style.backgroundPosition = 'center';
      }
    });

  // Fetch hotel image
  const hotelQuery = itin.travel.hotel.name + " hotel exterior";
  fetchImages(hotelQuery, 'image')
    .then(data => {
      if (data && data.items && data.items[0]) {
        const hotelImage = data.items[0].link;
        const hotelEl = document.querySelector('.accommodation-image');
        hotelEl.style.backgroundImage = `url(${hotelImage})`;
        hotelEl.style.backgroundSize = 'cover';
        hotelEl.style.backgroundPosition = 'center';
      }
    });

  // Render activities with modern cards
  const activitiesContainer = document.getElementById('activitiesANDdining');
  
  // Clear existing content
  activitiesContainer.innerHTML = '';
  
  // Loop through activities and create cards
  itin.activitiesANDdining.forEach((activity, index) => {
    // Create activity card with initial structure
    const activityCard = document.createElement('div');
    activityCard.className = 'bg-white rounded-xl overflow-hidden shadow-md h-full flex flex-col';
    activityCard.setAttribute('data-aos', 'fade-up');
    activityCard.setAttribute('data-aos-delay', 100 + (index * 50));
    
    // Create image placeholder
    const imageContainer = document.createElement('div');
    imageContainer.className = 'h-48 bg-gray-200 relative overflow-hidden';
    
    // Create card content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'p-6 flex-1 flex flex-col';
    
    // Add date badge
    const dateBadge = document.createElement('div');
    dateBadge.className = 'absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs font-medium text-gray-700 shadow-sm';
    dateBadge.innerText = activity.date;
    imageContainer.appendChild(dateBadge);
    
    // Add activity title
    const title = document.createElement('h3');
    title.className = 'text-lg font-bold text-gray-900 mb-2';
    title.innerText = activity.activity;
    contentContainer.appendChild(title);
    
    // Add time
    const timeDiv = document.createElement('div');
    timeDiv.className = 'flex items-center text-sm text-gray-500 mb-3';
    timeDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      ${activity.start_time} - ${activity.end_time}
    `;
    contentContainer.appendChild(timeDiv);
    
    // Add description
    const description = document.createElement('p');
    description.className = 'text-gray-600 text-sm mb-4 flex-1';
    description.innerText = activity.description;
    contentContainer.appendChild(description);
    
    // Add website button if available
    if (activity.website) {
      const websiteLink = document.createElement('a');
      websiteLink.href = activity.website;
      websiteLink.target = '_blank';
      websiteLink.className = 'mt-auto text-sm inline-flex items-center text-primary-600 hover:text-primary-700';
      websiteLink.innerHTML = `
        <span>Visit Website</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      `;
      contentContainer.appendChild(websiteLink);
    }
    
    // Fetch and add activity image
    fetchImages(activity.activity, 'image')
      .then(data => {
        if (data && data.items && data.items[0]) {
          imageContainer.style.backgroundImage = `url(${data.items[0].link})`;
          imageContainer.style.backgroundSize = 'cover';
          imageContainer.style.backgroundPosition = 'center';
        } else {
          // Fallback image if search returns no results
          imageContainer.style.backgroundImage = 'url(https://images.unsplash.com/photo-1502920917128-1aa500764cbd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTZ8fHRvdXJpc3R8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60)';
          imageContainer.style.backgroundSize = 'cover';
        }
      })
      .catch(error => {
        console.error('Error fetching activity image:', error);
        // Fallback image on error
        imageContainer.style.backgroundImage = 'url(https://images.unsplash.com/photo-1502920917128-1aa500764cbd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTZ8fHRvdXJpc3R8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60)';
        imageContainer.style.backgroundSize = 'cover';
      });
    
    // Assemble the card
    activityCard.appendChild(imageContainer);
    activityCard.appendChild(contentContainer);
    
    // Add card to container
    activitiesContainer.appendChild(activityCard);
  });
});
