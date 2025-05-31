# src/main/services/csv_loader.py
import re
import pandas as pd
from pyproj import Transformer
from src.models.trecho import Trecho

class CSVLoader:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        # Ajuste EPSG conforme o CRS real do CSV (ex.: "EPSG:31983" para BH)
        self.transformer_to_wgs84 = Transformer.from_crs("EPSG:31983", "EPSG:4326", always_xy=True)

    def load_trechos(self):
        """
        Lê o CSV e retorna uma lista de objetos Trecho, preenchendo lat_inicio/lng_inicio e lat_fim/lng_fim.
        """
        df = pd.read_csv(self.csv_path, sep=";", dtype=str)
        trechos = []

        for _, row in df.iterrows():
            geom_text = row.get("GEOMETRIA", "")
            lat_i = lng_i = lat_f = lng_f = None

            if isinstance(geom_text, str) and geom_text.upper().startswith("LINESTRING"):
                coords_part = re.search(r"\(\s*(.+)\s*\)", geom_text)
                if coords_part:
                    pts = coords_part.group(1).split(",")
                    try:
                        # Primeiro ponto
                        x1_str, y1_str = pts[0].strip().split()
                        x1, y1 = float(x1_str), float(y1_str)
                        lng_i, lat_i = self.transformer_to_wgs84.transform(x1, y1)
                    except:
                        lat_i = lng_i = None

                    try:
                        # Último ponto
                        x2_str, y2_str = pts[-1].strip().split()
                        x2, y2 = float(x2_str), float(y2_str)
                        lng_f, lat_f = self.transformer_to_wgs84.transform(x2, y2)
                    except:
                        lat_f = lng_f = None

            try:
                id_tcv_int = int(row.get("ID_TCV", 0))
            except:
                id_tcv_int = None

            trecho_obj = Trecho(
                id_tcv = id_tcv_int,
                logradouro = row.get("LOGRADOURO", ""),
                lat_inicio = lat_i,
                lng_inicio = lng_i,
                lat_fim = lat_f,
                lng_fim = lng_f
            )
            trechos.append(trecho_obj)

        return trechos
