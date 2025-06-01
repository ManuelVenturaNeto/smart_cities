document.addEventListener('DOMContentLoaded', function() {
    const addressInputs = document.getElementById('address-inputs');
    const addAddressBtn = document.getElementById('add-address');
    const calculateBtn = document.getElementById('calculate-route');
    const routeSummary = document.getElementById('route-summary');
    let map;
    let directionsService;
    let directionsRenderer;
    
    // Initialize map
    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 0, lng: 0},
            zoom: 2
        });
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);
    }
    
    initMap();
    
    // Add new address input
    addAddressBtn.addEventListener('click', function() {
        const div = document.createElement('div');
        div.className = 'address-group';
        div.innerHTML = `
            <input type="text" class="address-input" placeholder="Enter address">
            <button class="remove-address">×</button>
        `;
        addressInputs.appendChild(div);
    });
    
    // Remove address input
    addressInputs.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-address')) {
            if (document.querySelectorAll('.address-group').length > 2) {
                e.target.parentElement.remove();
            } else {
                alert('You need at least two addresses');
            }
        }
    });
    
    // Calculate route
    calculateBtn.addEventListener('click', function() {
        const addresses = Array.from(document.querySelectorAll('.address-input'))
            .map(input => input.value.trim())
            .filter(address => address);
        
        if (addresses.length < 2) {
            alert('Please enter at least two valid addresses');
            return;
        }
        
        const mode = document.querySelector('input[name="mode"]:checked').value;
        
        fetch('/calculate_route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                addresses: addresses,
                mode: mode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            
            displayRoute(data.route, data.polyline);
            renderMapRoute(data.polyline);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error calculating route');
        });
    });
    
    // Display route summary
    function displayRoute(route, polyline) {
        let html = '';
        
        route.segments.forEach((segment, index) => {
            html += `
                <div class="segment">
                    <h3>Segment ${index + 1}: ${segment.start} to ${segment.end}</h3>
                    <p>Mode: ${formatMode(segment.mode)}</p>
                    <p>Distance: ${segment.distance}</p>
                    <p>Duration: ${segment.duration}</p>
                </div>
            `;
        });
        
        html += `
            <div class="total">
                <h3>Total</h3>
                <p>Total Distance: ${route.total_distance_km} km</p>
                <p>Total Duration: ${route.total_duration_mins} minutes</p>
            </div>
        `;
        
        routeSummary.innerHTML = html;
    }
    
    // Render route on map
    function renderMapRoute(polyline) {
        const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
        
        const routePath = new google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 4
        });
        
        routePath.setMap(map);
        
        // Fit map to route bounds
        const bounds = new google.maps.LatLngBounds();
        decodedPath.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
    }
    
    // Format mode for display
    function formatMode(mode) {
        const modes = {
            'driving': 'Driving',
            'walking': 'Walking',
            'transit': 'Public Transport'
        };
        return modes[mode] || mode;
    }
    
    // Initialize autocomplete for address inputs
    function initAutocomplete() {
        const inputs = document.querySelectorAll('.address-input');
        inputs.forEach(input => {
            new google.maps.places.Autocomplete(input);
        });
    }
    
    // Reinitialize autocomplete when new inputs are added
    addressInputs.addEventListener('DOMNodeInserted', function() {
        initAutocomplete();
    });
    
    initAutocomplete();
});