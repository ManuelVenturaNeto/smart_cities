import logging
import os
import googlemaps
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class GoogleMapsService:
    """
    Class to interact with Google Maps API for route calculations and distance matrices.
    """

    def __init__(self):
        self.log = logging.getLogger(__name__)
        self.api_key = os.getenv("GOOGLE_MAPS_SERVER_KEY")
        if not self.api_key:
            self.log.error("Google Maps API key not found in environment variables")
            raise ValueError("Google Maps API key not configured")

        self.client = googlemaps.Client(key=self.api_key)
        self.log.debug("Google Maps service initialized")

    def get_route(self, origins, destinations, mode, waypoints=None):
        """
        Get the route between two locations using Google Maps Directions API.
        """
        try:
            self.log.debug(
                f"Getting route from {origins} to {destinations} with {len(waypoints) if waypoints else 0} waypoints (mode: {mode})"
            )

            now = datetime.now()
            if mode == "transit":
                # Transit mode has limitations - can't use waypoints unless exactly two
                # if waypoints and len(waypoints) != 2:
                #     self.log.warning("Transit mode requires exactly two waypoints or none")
                #     return None

                directions = self.client.directions(
                    origins,
                    destinations,
                    mode=mode,
                    alternatives=False,
                    departure_time=now,
                    transit_mode=["bus", "subway", "train"],
                    transit_routing_preference="less_walking",
                )
            else:
                directions = self.client.directions(
                    origins,
                    destinations,
                    mode=mode,
                    alternatives=False,
                    departure_time=now,
                    traffic_model="optimistic",
                    waypoints=waypoints if waypoints else None,
                    optimize_waypoints=True,
                )

            if directions:
                self.log.debug(f'Route found with {len(directions[0]["legs"])} legs')
                return directions[0]

            self.log.warning(f"No route found between {origins} and {destinations}")
            return None

        except Exception as e:
            self.log.error(f"Error getting directions: {str(e)}", exc_info=True)
            return None

    def get_distance_matrix(self, origins, destinations, mode):
        """
        Get the distance matrix for multiple origins and destinations using Google Maps Distance Matrix API.
        """
        try:
            self.log.debug(
                f"Getting distance matrix for {len(origins)} origins and {len(destinations)} destinations"
            )
            matrix = self.client.distance_matrix(origins, destinations, mode=mode)
            return matrix
        except Exception as e:
            self.log.error(f"Error getting distance matrix: {str(e)}", exc_info=True)
            return None
