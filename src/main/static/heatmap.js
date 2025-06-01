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
        loadingElement.style.display = 'flex';
        
        fetch('/get_heatmap_data?type=speed-reducer')
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
                    'rgba(0, 255, 0, 0)',
                    'rgba(100, 100, 255, 1)',
                    'rgba(0, 255, 255, 1)',
                    'rgba(255, 255, 0, 1)',
                    'rgba(255, 128, 0, 1)',
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

    function updateHeatmap(points) {
        // Filter out invalid points
        const validPoints = points
            .filter(point => isValidLatLng(point.lat, point.lng))
            .map(point => new google.maps.LatLng(point.lat, point.lng));
        
        if (validPoints.length === 0) {
            showMessage('No valid coordinates found in the data.');
            return;
        }
        
        if (heatmap) {
            heatmap.setData(validPoints);
        } else {
            heatmapData = validPoints;
            initHeatmap();
        }
        
        fitMapToBounds();
    }
    function setupControls() {
        document.querySelectorAll('.controls button').forEach(button => {
            button.addEventListener('click', async function() {
                const loadingElement = document.getElementById('loading');
                loadingElement.style.display = 'flex';
                
                try {
                    const heatmapType = this.id.replace('heatmap-', '');
                    const response = await fetch(`/get_heatmap_data?type=${heatmapType}`);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    updateHeatmap(data.points);
                } catch (error) {
                    console.error('Error loading heatmap data:', error);
                    showMessage(`Error loading heatmap data: ${error.message}`);
                } finally {
                    loadingElement.style.display = 'none';
                }
            });
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