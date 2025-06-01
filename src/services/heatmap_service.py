import json
import os
import logging
from dotenv import load_dotenv
from pathlib import Path
from pyproj import Transformer

load_dotenv()


class HeatmapService:
    """
    Service to handle heatmap data loading and processing.
    """

    def __init__(self):
        self.log = logging.getLogger(__name__)
        # Get the project root directory
        self.data_dir = Path(__file__).parent.parent.parent / "data"
        self.log.debug(f"HeatmapService initialized with data directory: {self.data_dir}")
        
        # Verify data directory exists
        if not self.data_dir.exists():
            self.log.error(f"Data directory not found at: {self.data_dir}")
            raise FileNotFoundError(f"Data directory not found at: {self.data_dir}")
        
        # List available files for debugging
        available_files = list(self.data_dir.glob("*.json"))
        self.log.info(f"Available JSON files: {[f.name for f in available_files]}")

        # Initialize coordinate transformer (example for UTM zone 23S - adjust as needed)
        self.transformer = Transformer.from_crs(
            "EPSG:32723", "EPSG:4326"
        )  # UTM 23S to WGS84

    def convert_to_latlon(self, x, y):
        """Convert projected coordinates to latitude/longitude"""
        try:
            lat, lon = self.transformer.transform(x, y)
            return {"lat": lat, "lng": lon}
        except Exception as e:
            self.log.error(f"Coordinate conversion failed: {str(e)}")
            return None

    def parse_linestring(self, linestring):
        """Parse LINESTRING coordinates and convert to lat/lon"""
        try:
            # Remove "LINESTRING (" and ")"
            coords_str = linestring[12:-1]
            # Split into coordinate pairs
            pairs = coords_str.split(", ")
            points = []

            for pair in pairs:
                x, y = map(float, pair.split())
                converted = self.convert_to_latlon(x, y)
                if converted:
                    points.append(converted)

            return points
        except Exception as e:
            self.log.error(f"Error parsing LINESTRING: {str(e)}")
            return []

    def load_data(self, heatmap_type: str):
        """
        Load JSON data for specific heatmap type.
        """
        self.log.info(f"Loading heatmap data for {heatmap_type}")
        
        try:
            # Map button IDs to filenames
            file_mapping = {
                "speed-reducer": "redutor_velocidade.json",
                "traffic-light-signaling": "sinalizacao_semaforica.json",
                "electronic-physicalization": "fiscalizacao_eletronica.json",
                "public-parking-elderly-person": "estacionamento_publico_pessoa_idosa.json",
                "short-term-parking": "estacionamento_rotativo.json", 
                "rotary-sales-point": "posto_venda_rotativo.json",
                "traffic-accident-with-victims": "sinistro_transito_vitima.json"
            }
                    
            filename = file_mapping.get(heatmap_type)
            if not filename:
                self.log.warning(f"No mapping found for heatmap type: {heatmap_type}")
                return {"points": []}
                
            file_path = self.data_dir / filename
            
            if not file_path.exists():
                available_files = "\n".join([f.name for f in self.data_dir.glob("*")])
                self.log.error(
                    f"File {filename} not found in {self.data_dir}\n"
                    f"Available files:\n{available_files}"
                )
                return {"points": []}

            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            points = []
            if "fields" in data and "records" in data:
                field_names = [field["id"] for field in data["fields"]]
                for record in data["records"]:
                    row = dict(zip(field_names, record))
                    if "GEOMETRIA" in row:
                        points.extend(self.process_geometry(row["GEOMETRIA"]))
            elif isinstance(data, list):
                for item in data:
                    if "GEOMETRIA" in item:
                        points.extend(self.process_geometry(item["GEOMETRIA"]))
            
            self.log.info(f"Processed {len(points)} points from {filename}")
            return {"points": points}

        except json.JSONDecodeError as e:
            self.log.error(f"Invalid JSON in {filename}: {str(e)}")
            return {"points": []}
        except Exception as e:
            self.log.error(f"Error loading {filename}: {str(e)}", exc_info=True)
            return {"points": []}

    def process_geometry(self, geom):
        """Helper method to process geometry data"""
        points = []
        try:
            # Handle LINESTRING format
            if isinstance(geom, str) and geom.startswith("LINESTRING"):
                line_points = self.parse_linestring(geom)
                points.extend(line_points)

            # Handle POINT format
            elif isinstance(geom, str) and geom.startswith("POINT"):
                coords = geom[7:-1].split()  # Remove "POINT (" and ")"
                if len(coords) == 2:
                    x, y = map(float, coords)
                    converted = self.convert_to_latlon(x, y)
                    if converted:
                        points.append(converted)

            # Handle GeoJSON format
            elif isinstance(geom, dict) and "coordinates" in geom:
                if geom["type"] == "LineString":
                    for coord in geom["coordinates"]:
                        x, y = coord
                        converted = self.convert_to_latlon(x, y)
                        if converted:
                            points.append(converted)
                elif geom["type"] == "Point":
                    x, y = geom["coordinates"]
                    converted = self.convert_to_latlon(x, y)
                    if converted:
                        points.append(converted)
        except Exception as e:
            self.log.error(f"Error processing geometry: {str(e)}")
        
        return points
