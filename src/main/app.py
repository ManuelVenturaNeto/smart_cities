# src/main/app.py
import os
from flask import Flask, render_template, request
from dotenv import load_dotenv

from src.services.csv_loader import CSVLoader
from src.services.google_maps_client import GoogleMapsClient

load_dotenv()  # Garante que as variáveis de .env sejam carregadas

def create_app():
    api_key_browser = os.getenv("GOOGLE_MAPS_BROWSER_KEY")
    api_key_server  = os.getenv("GOOGLE_MAPS_SERVER_KEY")

    print("Chave do Google Maps para o navegador:", api_key_browser)
    print("Chave do Google Maps para o servidor: ", api_key_server)

    if not api_key_browser:
        raise RuntimeError("GOOGLE_MAPS_BROWSER_KEY não está definida")
    if not api_key_server:
        raise RuntimeError("GOOGLE_MAPS_SERVER_KEY não está definida")

    maps_client = GoogleMapsClient(api_key_server)  # Atenção: aqui passa api_key_server

    # Carrega trechos do CSV …
    csv_path = os.path.join(os.getcwd(), "data", "trecho_circulacao_viaria.csv")
    loader = CSVLoader(csv_path)
    trechos = loader.load_trechos()

    app = Flask(__name__, template_folder="templates", static_folder="static")

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
                dist_km = round(dist_m/1000, 3) if dist_m is not None else None
                dur_min = round(dur_s/60, 2)    if dur_s is not None else None
                dur_traffic_min = round(dur_traffic_s/60, 2) if dur_traffic_s is not None else None

                results.append({
                    "id": trecho.id_tcv,
                    "logradouro": trecho.logradouro,
                    "dist_km": dist_km,
                    "duration_min": dur_min,
                    "duration_traffic_min": dur_traffic_min,
                    "lat_inicio": trecho.lat_inicio,
                    "lng_inicio": trecho.lng_inicio
                })

                if trecho.lat_inicio is not None and trecho.lng_inicio is not None:
                    coords_list.append({
                        "lat": trecho.lat_inicio,
                        "lng": trecho.lng_inicio,
                        "titulo": f"{trecho.logradouro} (ID {trecho.id_tcv})"
                    })

            # Injetar CHAVE DO BROWSER no JS
            configuration = {
                "mapsApiKey": api_key_browser,
                "mapOptions": {
                    "center": {"lat": -19.9200, "lng": -43.9400},
                    "zoom": 13,
                    "mapId": "9a905a61a2b530e37d0957f6",
                    "fullscreenControl": True,
                    "mapTypeControl": False,
                    "streetViewControl": False,
                    "zoomControl": True,
                    "maxZoom": 20
                }
            }

            return render_template(
                "results.html",
                mode=modo,
                results=results,
                coords_list=coords_list,
                configuration=configuration
            )

        return render_template("index.html")

    return app
