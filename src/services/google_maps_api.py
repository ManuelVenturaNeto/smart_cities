import os
import googlemaps
from dotenv import load_dotenv

load_dotenv()

class GoogleMapsService:
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_MAPS_SERVER_KEY')
        self.client = googlemaps.Client(key=self.api_key)

    def get_route(self, origins, destinations, mode='driving'):
        try:
            directions = self.client.directions(
                origins,
                destinations,
                mode=mode,
                alternatives=False
            )
            return directions[0] if directions else None
        except Exception as e:
            print(f"Error getting directions: {e}")
            return None

    def get_distance_matrix(self, origins, destinations, mode='driving'):
        try:
            matrix = self.client.distance_matrix(
                origins,
                destinations,
                mode=mode
            )
            return matrix
        except Exception as e:
            print(f"Error getting distance matrix: {e}")
            return None