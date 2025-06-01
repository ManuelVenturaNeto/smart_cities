document.addEventListener('DOMContentLoaded', function() {
    let map;
    let heatmap;
    let heatmapData = [];
    let currentRadius = 25; // Default radius
    
    // Initialize map
    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 12,
            center: {lat: -19.9227, lng: -43.9451},  // Default center near Belo Horizonte
            mapTypeId: 'roadmap',
            scrollwheel: true // Ensure scroll is enabled
        });
        
        // Add scroll event listener for radius control
        setupScrollControl();
        // Load data from server
        loadHeatmapData();
    }

    function setupScrollControl() {
        // Create a control div for scroll instructions
        const scrollControlDiv = document.createElement('div');
        scrollControlDiv.innerHTML = '<div class="scroll-control">Scroll to adjust radius</div>';
        scrollControlDiv.style.padding = '5px';
        scrollControlDiv.style.backgroundColor = 'white';
        scrollControlDiv.style.borderRadius = '4px';
        scrollControlDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        scrollControlDiv.style.cursor = 'pointer';
        scrollControlDiv.style.margin = '10px';
        
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(scrollControlDiv);
        
        // Add scroll event to map
        google.maps.event.addDomListener(map.getDiv(), 'wheel', function(e) {
            if (e.ctrlKey) { // Only adjust radius when Ctrl key is pressed
                e.preventDefault();
                e.stopPropagation();
                
                // Determine scroll direction
                const delta = Math.sign(e.deltaY);
                currentRadius = Math.max(5, Math.min(100, currentRadius - delta * 5));
                
                if (heatmap) {
                    heatmap.set('radius', currentRadius);
                }
                
                // Update control text
                scrollControlDiv.innerHTML = `<div class="scroll-control">Radius: ${currentRadius}px (Ctrl+Scroll)</div>`;
                
                // Show temporary feedback
                const feedback = document.createElement('div');
                feedback.className = 'radius-feedback';
                feedback.textContent = `Radius: ${currentRadius}px`;
                document.querySelector('.container').appendChild(feedback);
                
                // Remove feedback after delay
                setTimeout(() => {
                    feedback.remove();
                }, 1000);
            }
        });
    }

    function loadHeatmapData() {
        const loadingElement = document.getElementById('loading');
        loadingElement.style.display = 'flex'; // Ensure loading is visible
        
        fetch('/get_heatmap_data')
            .then(handleResponse)
            .then(handleData)
            .catch(handleError);
        
        function handleResponse(response) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }
        
        function handleData(data) {
            loadingElement.style.display = 'none';
            
            if (!data.points || data.points.length === 0) {
                showMessage('No heatmap data available. Please ensure JSON files are placed in the data directory.');
                return;
            }
            
            // Filter out invalid points
            heatmapData = data.points
                .filter(point => isValidLatLng(point.lat, point.lng))
                .map(point => new google.maps.LatLng(point.lat, point.lng));
            
            if (heatmapData.length === 0) {
                showMessage('No valid coordinates found in the data.');
                return;
            }
            
            initHeatmap();
            fitMapToBounds();
            setupControls();
        }
        
        function handleError(error) {
            console.error('Error loading heatmap data:', error);
            loadingElement.style.display = 'none';
            showMessage(`Error loading heatmap data: ${error.message}`);
        }
    }
    
    function isValidLatLng(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
   
    function initHeatmap() {
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: map,
            radius: currentRadius, // Use the current radius value
            opacity: 0.7,
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(0, 0, 223, 1)',
                'rgba(0, 0, 191, 1)',
                'rgba(0, 0, 159, 1)',
                'rgba(0, 0, 127, 1)',
                'rgba(63, 0, 91, 1)',
                'rgba(127, 0, 63, 1)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        });
    }
    
    function fitMapToBounds() {
        const bounds = new google.maps.LatLngBounds();
        heatmapData.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
        
        // Add some padding if needed
        map.panToBounds(bounds);
    }
    
    function setupControls() {
        document.getElementById('toggle-heatmap').addEventListener('click', function() {
            heatmap.setMap(heatmap.getMap() ? null : map);
        });
        
        document.getElementById('change-gradient').addEventListener('click', function() {
            const gradients = [
                null, // Default gradient
                [
                    'rgba(0, 255, 0, 0)',
                    'rgba(0, 255, 0, 1)',
                    'rgba(255, 255, 0, 1)',
                    'rgba(255, 128, 0, 1)',
                    'rgba(255, 0, 0, 1)'
                ],
                [
                    'rgba(128, 0, 128, 0)',
                    'rgba(128, 0, 128, 1)',
                    'rgba(0, 0, 255, 1)',
                    'rgba(0, 255, 255, 1)',
                    'rgba(255, 255, 255, 1)'
                ]
            ];
            
            const currentGradient = heatmap.get('gradient');
            const nextIndex = (gradients.indexOf(currentGradient) + 1) % gradients.length;
            heatmap.set('gradient', gradients[nextIndex]);
        });
        
        document.getElementById('change-radius').addEventListener('click', function() {
            const radii = [null, 10, 20, 30, 50];
            const currentRadius = heatmap.get('radius') || 25;
            const nextIndex = (radii.indexOf(currentRadius) + 1) % radii.length;
            heatmap.set('radius', radii[nextIndex] || 25);
        });
        
        document.getElementById('change-opacity').addEventListener('click', function() {
            const opacities = [null, 0.2, 0.4, 0.6, 0.8, 1.0];
            const currentOpacity = heatmap.get('opacity') || 0.7;
            const nextIndex = (opacities.indexOf(currentOpacity) + 1) % opacities.length;
            heatmap.set('opacity', opacities[nextIndex] || 0.7);
        });
    }
    
    function showMessage(message) {
        const msgElement = document.createElement('div');
        msgElement.className = 'error-message';
        msgElement.textContent = message;
        document.querySelector('.container').appendChild(msgElement);
    }
    
    initMap();
});