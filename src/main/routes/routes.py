from flask import Blueprint, render_template, request, jsonify, current_app
from src.services.google_maps_api import GoogleMapsService
from src.models.trecho import CompleteRoute, RouteSegment

routes_bp = Blueprint('routes', __name__)

maps_service = GoogleMapsService()

@routes_bp.route('/')
def home():
    return render_template('home.html', google_maps_key=current_app.config['GOOGLE_MAPS_KEY'])

@routes_bp.route('/calculate_route', methods=['POST'])
def calculate_route():
    data = request.get_json()
    addresses = data.get('addresses', [])
    mode = data.get('mode', 'driving')
    
    if len(addresses) < 2:
        return jsonify({'error': 'At least two addresses are required'}), 400
    
    segments = []
    for i in range(len(addresses)-1):
        origin = addresses[i]
        destination = addresses[i+1]
        
        route = maps_service.get_route(origin, destination, mode)
        if not route:
            return jsonify({'error': f'Could not calculate route from {origin} to {destination}'}), 400
        
        leg = route['legs'][0]
        segments.append(RouteSegment(
            start_address=leg['start_address'],
            end_address=leg['end_address'],
            distance=leg['distance'],
            duration=leg['duration'],
            mode=mode
        ))
    
    complete_route = CompleteRoute(segments)
    return jsonify({
        'route': complete_route.get_summary(),
        'polyline': route['overview_polyline']['points']
    })