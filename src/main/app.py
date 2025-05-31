# src/main/app.py
import os
from flask import Flask, render_template, request
from dotenv import load_dotenv

from src.services.csv_loader import CSVLoader
from src.services.google_maps_client import GoogleMapsClient

load_dotenv()  # Carrega variáveis de ambiente do .env

def create_app():
    # Chave para carregamento no frontend (com restrição de referer)
    api_key_browser = os.getenv("GOOGLE_MAPS_BROWSER_KEY")
    # Chave para backend (sem restrição de referer ou restrita por IP)
    api_key_server = os.getenv("GOOGLE_MAPS_SERVER_KEY")

    if not api_key_browser:
        raise RuntimeError("A variável de ambiente 'GOOGLE_MAPS_BROWSER_KEY' não está definida.")
    if not api_key_server:
        raise RuntimeError("A variável de ambiente 'GOOGLE_MAPS_SERVER_KEY' não está definida.")

    # Inicializa o cliente de Distance Matrix (backend)
    maps_client = GoogleMapsClient(api_key_server)

    # Carrega todos os trechos (no startup). Ajuste o caminho do CSV conforme necessário.
    csv_path = os.path.join(os.getcwd(), "data", "trecho_circulacao_viaria.csv")
    loader = CSVLoader(csv_path)
    trechos = loader.load_trechos()

    current_dir = os.path.dirname(__file__)  # .../smart cities/src/main
    templates_path = os.path.join(current_dir, "templates")
    static_path = os.path.join(current_dir, "static")

    app = Flask(
        __name__,
        template_folder=templates_path,
        static_folder=static_path
    )

    @app.route("/", methods=["GET", "POST"])
    def index():
        if request.method == "POST":
            modo = request.form.get("mode", "driving").lower()

            results = []
            coords_list = []

            for trecho in trechos:
                dist_m, dur_s, dur_traffic_s, status = maps_client.get_distance_time(
                    trecho.lat_inicio,
                    trecho.lng_inicio,
                    trecho.lat_fim,
                    trecho.lng_fim,
                    modo
                )

                # Converte para km/min ou None
                dist_km = round(dist_m / 1000, 3) if dist_m is not None else None
                duration_min = round(dur_s / 60, 2) if dur_s is not None else None
                duration_traffic_min = round(dur_traffic_s / 60, 2) if dur_traffic_s is not None else None

                results.append({
                    "id": trecho.id_tcv,
                    "logradouro": trecho.logradouro,
                    "dist_km": dist_km,
                    "duration_min": duration_min,
                    "duration_traffic_min": duration_traffic_min,
                    "lat_inicio": trecho.lat_inicio,
                    "lng_inicio": trecho.lng_inicio
                })

                # Prepara coords_list apenas se houver lat/lng válidos
                if trecho.lat_inicio is not None and trecho.lng_inicio is not None:
                    coords_list.append({
                        "lat": trecho.lat_inicio,
                        "lng": trecho.lng_inicio,
                        "titulo": f"{trecho.logradouro} (ID {trecho.id_tcv})"
                    })

            # Configuração que vai para o JS (apenas a chave do browser)
            configuration = {
                "mapsApiKey": api_key_browser,
                "mapOptions": {
                    "center": {"lat": -19.9200, "lng": -43.9400},
                    "fullscreenControl": True,
                    "mapTypeControl": False,
                    "streetViewControl": False,
                    "zoom": 13,
                    "zoomControl": True,
                    "maxZoom": 20,
                    "mapId": ""
                }
            }

            return render_template(
                "results.html",
                mode=modo,
                results=results,
                coords_list=coords_list,
                configuration=configuration
            )

        # GET
        return render_template("index.html")

    return app
