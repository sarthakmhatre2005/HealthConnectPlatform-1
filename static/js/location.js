// HealthConnect Location JavaScript

let userLocation = null;
let doctorMap = null;
let markers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize map if the element exists
    const mapElement = document.getElementById('doctor-map') || document.getElementById('hospital-map');
    if (mapElement) {
        initializeMap(mapElement);
    }
    
    // Setup location button
    const locationButton = document.getElementById('get-user-location');
    if (locationButton) {
        locationButton.addEventListener('click', getUserLocation);
    }
    
    // Setup filtering
    const specializationFilter = document.getElementById('specialization-filter');
    if (specializationFilter) {
        specializationFilter.addEventListener('change', function() {
            const selectedSpecialization = this.value;
            filterDoctors(selectedSpecialization);
        });
    }
});

// Initialize the map
function initializeMap(mapElement) {
    // Create a default map centered on United States
    doctorMap = L.map(mapElement).setView([37.0902, -95.7129], 4);
    
    // Add the tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(doctorMap);
    
    // Add markers for doctors or hospitals
    addMarkers();
}

// Add markers to the map
function addMarkers() {
    // Clear existing markers
    if (markers.length > 0) {
        markers.forEach(marker => doctorMap.removeLayer(marker));
        markers = [];
    }
    
    // Get all doctor or hospital cards
    const cards = document.querySelectorAll('.doctor-card') || document.querySelectorAll('.hospital-card');
    
    cards.forEach(card => {
        const lat = parseFloat(card.dataset.lat);
        const lng = parseFloat(card.dataset.lng);
        
        // Only add marker if coordinates are valid
        if (!isNaN(lat) && !isNaN(lng)) {
            const name = card.querySelector('h5').textContent;
            const specialty = card.querySelector('.text-muted').textContent;
            
            // Create a custom icon
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pin bg-primary"><i class="fas fa-user-md text-white"></i></div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            });
            
            // Create marker and popup
            const marker = L.marker([lat, lng], {icon}).addTo(doctorMap);
            marker.bindPopup(`
                <div class="map-popup">
                    <h6 class="map-popup-title">${name}</h6>
                    <p class="map-popup-subtitle">${specialty}</p>
                    <a href="#" class="btn btn-sm btn-primary" onclick="scrollToCard('${card.id}')">View Details</a>
                </div>
            `);
            
            // Store marker and associated card ID
            marker.cardId = card.id;
            markers.push(marker);
        }
    });
    
    // If we have markers, adjust the map to fit all markers
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        doctorMap.fitBounds(group.getBounds().pad(0.1));
    }
}

// Scroll to a specific card when clicking on a map marker
function scrollToCard(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight');
        setTimeout(() => {
            card.classList.remove('highlight');
        }, 2000);
    }
}

// Get user's location
function getUserLocation() {
    const alertsContainer = document.getElementById('location-alerts');
    const locationBtn = document.getElementById('get-user-location');
    
    if (alertsContainer) {
        alertsContainer.innerHTML = ''; // Clear previous alerts
    }
    
    // Change button to loading state
    if (locationBtn) {
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Getting location...';
    }
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        showLocationAlert('danger', 'Geolocation is not supported by your browser.');
        resetLocationButton();
        return;
    }
    
    // Get current position
    navigator.geolocation.getCurrentPosition(
        // Success callback
        position => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Update the map
            if (doctorMap) {
                // Add user marker
                const userIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin bg-success"><i class="fas fa-user text-white"></i></div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42]
                });
                
                const userMarker = L.marker([userLocation.lat, userLocation.lng], {icon: userIcon})
                    .addTo(doctorMap)
                    .bindPopup("<b>Your Location</b>")
                    .openPopup();
                
                markers.push(userMarker);
                
                // Refit the map to include the user's location
                const group = new L.featureGroup(markers);
                doctorMap.fitBounds(group.getBounds().pad(0.1));
            }
            
            // Calculate and display distances
            calculateDistances();
            
            // Show success message
            showLocationAlert('success', 'Location found! Showing healthcare providers near you.');
            
            // Reset location button
            resetLocationButton(true);
        },
        // Error callback
        error => {
            let errorMessage = 'Unable to retrieve your location.';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access was denied. Please allow access to your location.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'The request to get your location timed out.';
                    break;
            }
            
            showLocationAlert('danger', errorMessage);
            resetLocationButton();
        },
        // Options
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Calculate distances between user and doctors/hospitals
function calculateDistances() {
    if (!userLocation) return;
    
    // Get all doctor or hospital cards
    const cards = document.querySelectorAll('.doctor-card') || document.querySelectorAll('.hospital-card');
    
    cards.forEach(card => {
        const lat = parseFloat(card.dataset.lat);
        const lng = parseFloat(card.dataset.lng);
        
        // Only calculate distance if coordinates are valid
        if (!isNaN(lat) && !isNaN(lng)) {
            const distance = calculateHaversineDistance(
                userLocation.lat, userLocation.lng,
                lat, lng
            );
            
            // Update distance in the card
            const distanceElement = card.querySelector('.doctor-distance, .hospital-distance');
            if (distanceElement) {
                distanceElement.querySelector('span').textContent = `${distance.toFixed(1)} km away`;
                distanceElement.classList.remove('d-none');
            }
            
            // Store distance as data attribute for sorting
            card.dataset.distance = distance;
        }
    });
    
    // Sort cards by distance
    sortCardsByDistance();
}

// Calculate distance between two points using the Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Sort cards by distance from user
function sortCardsByDistance() {
    const container = document.querySelector('.doctor-cards-container') || document.querySelector('.hospital-cards-container');
    if (!container) return;
    
    const cards = Array.from(container.children);
    
    // Sort cards by distance
    cards.sort((a, b) => {
        const distanceA = parseFloat(a.dataset.distance) || Infinity;
        const distanceB = parseFloat(b.dataset.distance) || Infinity;
        return distanceA - distanceB;
    });
    
    // Remove all cards from container
    container.innerHTML = '';
    
    // Add sorted cards back to container
    cards.forEach(card => {
        container.appendChild(card);
    });
}

// Filter doctors by specialization
function filterDoctors(specialization) {
    const doctorCards = document.querySelectorAll('.doctor-card');
    
    doctorCards.forEach(card => {
        const cardSpecialization = card.dataset.specialization;
        
        if (!specialization || specialization === '' || cardSpecialization.includes(specialization.toLowerCase())) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update markers on the map
    updateMapMarkers();
}

// Update map markers based on filtered doctors
function updateMapMarkers() {
    if (!doctorMap) return;
    
    markers.forEach(marker => {
        if (marker.cardId) {
            const card = document.getElementById(marker.cardId);
            if (card) {
                if (card.style.display === 'none') {
                    doctorMap.removeLayer(marker);
                } else if (!doctorMap.hasLayer(marker)) {
                    marker.addTo(doctorMap);
                }
            }
        }
    });
    
    // Refit the map to show visible markers
    const visibleMarkers = markers.filter(marker => 
        !marker.cardId || document.getElementById(marker.cardId)?.style.display !== 'none'
    );
    
    if (visibleMarkers.length > 0) {
        const group = new L.featureGroup(visibleMarkers);
        doctorMap.fitBounds(group.getBounds().pad(0.1));
    }
}

// Show location alert message
function showLocationAlert(type, message) {
    const alertsContainer = document.getElementById('location-alerts');
    if (alertsContainer) {
        alertsContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show mt-2" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

// Reset location button to original state
function resetLocationButton(success = false) {
    const locationBtn = document.getElementById('get-user-location');
    if (locationBtn) {
        locationBtn.disabled = false;
        if (success) {
            locationBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i> Location Found';
            locationBtn.classList.remove('btn-primary');
            locationBtn.classList.add('btn-success');
        } else {
            locationBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i> Use my location';
        }
    }
}
