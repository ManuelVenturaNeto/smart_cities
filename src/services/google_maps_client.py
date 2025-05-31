# src/main/services/google_maps_client.py
import googlemaps

class GoogleMapsClient:
    def __init__(self, api_key: str):
        """
        Inicializa o cliente do Google Maps para chamadas server-to-server (Distance Matrix).
        Deve receber uma chave de API sem restrição de HTTP referrer (ou restrita por IP).
        """
        self.client = googlemaps.Client(key=api_key)

    def get_distance_time(self, lat1, lng1, lat2, lng2, modo):
        """
        Retorna (distance_m, duration_s, duration_traffic_s, status) ou (None, None, None, None) em caso de erro.
        - lat1, lng1: ponto de origem (float)
        - lat2, lng2: ponto de destino (float)
        - modo: string em minúsculas ("driving", "walking", "bicycling" ou "transit")
        """
        # Se não houver coordenadas válidas, retorna tupla de None
        if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
            return (None, None, None, None)

        origem = f"{lat1},{lng1}"
        destino = f"{lat2},{lng2}"

        # FORÇA minúsculas (a API só aceita "driving", "walking", "bicycling", "transit")
        travel_mode = modo.lower()

        try:
            matrix = self.client.distance_matrix(
                origins=[origem],
                destinations=[destino],
                mode=travel_mode,
                units="metric",
                departure_time="now"
            )
            elemento = matrix["rows"][0]["elements"][0]
            status = elemento["status"]
            if status != "OK":
                # Pode ser "ZERO_RESULTS", "NOT_FOUND", etc.
                return (None, None, None, status)

            distance_m = elemento["distance"]["value"]
            duration_s = elemento["duration"]["value"]
            # Só existe duration_in_traffic para modo "driving"
            duration_traffic_s = elemento.get("duration_in_traffic", {}).get("value", None)
            return (distance_m, duration_s, duration_traffic_s, status)

        except Exception as e:
            # Exibe no console para debug, mas continua retornando None
            print("Erro na chamada ao Distance Matrix:", e)
            return (None, None, None, None)
