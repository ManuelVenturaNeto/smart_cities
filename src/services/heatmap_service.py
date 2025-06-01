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
        self.data_dir = Path("data")
        self.log.debug(
            f"HeatmapService initialized with data directory: {self.data_dir}"
        )

        # Create directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)

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

    def load_data(self):
        """
        Load and combine all JSON files from the data directory.
        """
        self.log.info("Loading heatmap data")
        all_data = []

        try:
            file_paths = list(self.data_dir.glob("*.json"))

            if not file_paths:
                self.log.warning(f"No JSON files found in {self.data_dir}")
                return {"points": []}

            for file_path in file_paths:
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if "fields" in data and "records" in data:
                            field_names = [field["id"] for field in data["fields"]]
                            for record in data["records"]:
                                row = dict(zip(field_names, record))
                                all_data.append(row)
                        elif isinstance(data, list):
                            all_data.extend(data)
                        else:
                            all_data.append(data)
                    self.log.debug(f"Loaded data from {file_path.name}")
                except json.JSONDecodeError as e:
                    self.log.error(f"Invalid JSON in {file_path.name}: {str(e)}")
                    continue
                except Exception as e:
                    self.log.error(
                        f"Error loading {file_path.name}: {str(e)}", exc_info=True
                    )
                    continue

            # Extract coordinates from GEOMETRIA field
            points = []
            for item in all_data:
                try:
                    if "GEOMETRIA" in item:
                        geom = item["GEOMETRIA"]

                        # Handle LINESTRING format
                        if isinstance(geom, str) and geom.startswith("LINESTRING"):
                            line_points = self.parse_linestring(geom)
                            points.extend(line_points)

                        # Handle POINT format
                        elif isinstance(geom, str) and geom.startswith("POINT"):
                            coords = geom[6:-1].split()  # Remove "POINT (" and ")"
                            if len(coords) == 2:
                                x, y = map(float, coords)
                                converted = self.convert_to_latlon(x, y)
                                if converted:
                                    points.append(converted)

                        # Handle GeoJSON format if needed
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
                    self.log.error(f"Error processing geometry in item: {str(e)}")
                    continue

            self.log.info(
                f"Processed {len(points)} heatmap points from {len(file_paths)} files"
            )
            return {"points": points}

        except Exception as e:
            self.log.error(f"Error in load_data: {str(e)}", exc_info=True)
            return {"points": []}
