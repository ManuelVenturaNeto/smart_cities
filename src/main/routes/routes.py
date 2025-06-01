import logging
from flask import Blueprint, render_template, request, jsonify, current_app
from src.services.google_maps_api import GoogleMapsService
from src.models.trecho import CompleteRoute, RouteSegment

routes_bp = Blueprint("routes", __name__)
logger = logging.getLogger(__name__)

maps_service = GoogleMapsService()


@routes_bp.route("/")
def home():
    """
    Render the home page with Google Maps API key.
    """
    logger.debug("Home page accessed")
    try:
        return render_template(
            "home.html", google_maps_key=current_app.config["GOOGLE_MAPS_KEY"]
        )
    except Exception as e:
        logger.error(f"Error rendering home page: {str(e)}", exc_info=True)
        raise


@routes_bp.route("/calculate_route", methods=["POST"])
def calculate_route():
    """
    Calculate a route between multiple addresses using Google Maps API.
    """
    logger.info("Route calculation request received")
    try:
        data = request.get_json()
        if not data:
            logger.warning("Empty request data received")
            return jsonify({"error": "No data provided"}), 400

        addresses = data.get("addresses", [])
        mode = data.get("mode")

        logger.debug(f"Calculating route for {len(addresses)} addresses (mode: {mode})")

        if len(addresses) < 2:
            logger.warning("Insufficient addresses provided")
            return jsonify({"error": "At least two addresses are required"}), 400

        segments = []
        for i in range(len(addresses) - 1):
            origin = addresses[i]
            destination = addresses[i + 1]

            logger.debug(f"Processing segment {i + 1}: {origin} to {destination}")

            route = maps_service.get_route(origin, destination, mode)
            if not route:
                logger.error(f"Route calculation failed for segment {i + 1}")
                return (
                    jsonify(
                        {
                            "error": f"Could not calculate route from {origin} to {destination}"
                        }
                    ),
                    400,
                )

            leg = route["legs"][0]
            segments.append(
                RouteSegment(
                    start_address=leg["start_address"],
                    end_address=leg["end_address"],
                    distance=leg["distance"],
                    duration=leg["duration"],
                    mode=mode,
                )
            )

        complete_route = CompleteRoute(segments)
        logger.info("Route calculation completed successfully")

        return jsonify(
            {
                "route": complete_route.get_summary(),
                "polyline": route["overview_polyline"]["points"],
            }
        )

    except Exception as e:
        logger.error(f"Error calculating route: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@routes_bp.route("/heatmap")
def heatmap():
    """
    Render the heatmap page with Google Maps API key.
    """
    logger.debug("Heatmap page accessed")
    try:
        return render_template(
            "heatmap.html", google_maps_key=current_app.config["GOOGLE_MAPS_KEY"]
        )
    except Exception as e:
        logger.error(f"Error rendering heatmap page: {str(e)}", exc_info=True)
        raise

@routes_bp.route("/get_heatmap_data", methods=["GET"])
def get_heatmap_data():
    """
    Get heatmap data from JSON files.
    """
    logger.info("Heatmap data request received")
    try:
        from src.services.heatmap_service import HeatmapService
        heatmap_service = HeatmapService()
        data = heatmap_service.load_data()
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error getting heatmap data: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500