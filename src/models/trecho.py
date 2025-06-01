import logging


class RouteSegment:
    """
    Represents a segment of a route between two addresses.
    """

    def __init__(self, start_address, end_address, distance, duration, mode):
        self.log = logging.getLogger(__name__)
        self.start_address = start_address
        self.end_address = end_address
        self.distance = distance
        self.duration = duration
        self.mode = mode
        self.log.debug(f"Created RouteSegment: {start_address} to {end_address}")


class CompleteRoute:
    """
    Represents a complete route composed of multiple segments.
    """

    def __init__(self, segments):
        self.log = logging.getLogger(__name__)
        self.segments = segments
        self.total_distance = sum(seg.distance["value"] for seg in segments) / 1000
        self.total_duration = sum(seg.duration["value"] for seg in segments) / 60
        self.log.info(f"Created CompleteRoute with {len(segments)} segments")

    def get_summary(self):
        self.log.debug("Generating route summary")
        return {
            "total_distance_km": round(self.total_distance, 2),
            "total_duration_mins": round(self.total_duration, 2),
            "segments": [
                {
                    "start": seg.start_address,
                    "end": seg.end_address,
                    "distance": seg.distance["text"],
                    "duration": seg.duration["text"],
                    "mode": seg.mode,
                }
                for seg in self.segments
            ],
        }
