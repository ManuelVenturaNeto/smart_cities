import logging
from flask import Blueprint, render_template, request, jsonify, current_app
from src.services.google_maps_api import GoogleMapsService
from src.models.trecho import CompleteRoute, RouteSegment
from src.services.heatmap_service import HeatmapService
from src.services.data_analytics_service import DataService

routes_bp = Blueprint("routes", __name__)
logger = logging.getLogger(__name__)

maps_service = GoogleMapsService()

data_service = DataService(data_dir="data")


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

        # Special handling for transit mode
        if mode == "transit" and len(addresses) > 3:
            return (
                jsonify(
                    {
                        "error": "Transit mode supports maximum 3 points (origin, destination, and one waypoint)"
                    }
                ),
                400,
            )

        # Get origin, destination, and waypoints
        origin = addresses[0]
        destination = addresses[-1]
        waypoints = addresses[1:-1] if len(addresses) > 2 else None

        logger.debug(
            f"Processing route: {origin} to {destination} with waypoints: {waypoints}"
        )

        route = maps_service.get_route(origin, destination, mode, waypoints)
        if not route:
            error_msg = "Could not calculate route"
            if mode == "transit" and waypoints and len(waypoints) != 1:
                error_msg = "Transit mode supports exactly one waypoint between origin and destination"
            return jsonify({"error": error_msg}), 400

        segments = []
        for leg in route["legs"]:
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
    Get heatmap data for specific type from JSON files with optional filters.
    """

    heatmap_type = request.args.get("type")
    year_filter = request.args.get("year")
    fatality_filter = request.args.get("fatality")

    if not heatmap_type:
        return jsonify({"error": "Heatmap type parameter is required"}), 400

    logger.info(
        f"Heatmap data request received for type: {heatmap_type} with filters year={year_filter}, fatality={fatality_filter}"
    )
    try:

        heatmap_service = HeatmapService()
        data = heatmap_service.load_data(heatmap_type, year_filter, fatality_filter)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error getting heatmap data: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@routes_bp.route("/analytics")
def analytics():
    """Render the analytics dashboard page with Google Maps API key."""
    logger.debug("Analytics page accessed")
    try:
        datasets = data_service.get_available_datasets()
        return render_template(
            "analytics.html",
            google_maps_key=current_app.config["GOOGLE_MAPS_KEY"],
            datasets=datasets,
        )
    except Exception as e:
        logger.error(f"Error rendering analytics page: {str(e)}", exc_info=True)
        raise


@routes_bp.route("/get_dataset/<dataset_name>", methods=["GET"])
def get_dataset(dataset_name: str):
    """API endpoint to get dataset content with pagination"""
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=100, type=int)

    logger.info(
        f"Dataset request received for: {dataset_name} (page: {page}, per_page: {per_page})"
    )

    try:
        data = data_service.load_dataset(dataset_name, page, per_page)
        if data is None:
            return jsonify({"error": "Dataset not found"}), 404
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error getting dataset {dataset_name}: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
