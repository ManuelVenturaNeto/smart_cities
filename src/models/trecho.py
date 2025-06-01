class RouteSegment:
    def __init__(self, start_address, end_address, distance, duration, mode):
        self.start_address = start_address
        self.end_address = end_address
        self.distance = distance
        self.duration = duration
        self.mode = mode

class CompleteRoute:
    def __init__(self, segments):
        self.segments = segments
        self.total_distance = sum(seg.distance['value'] for seg in segments) / 1000  # in km
        self.total_duration = sum(seg.duration['value'] for seg in segments) / 60  # in minutes
    
    def get_summary(self):
        return {
            'total_distance_km': round(self.total_distance, 2),
            'total_duration_mins': round(self.total_duration, 2),
            'segments': [{
                'start': seg.start_address,
                'end': seg.end_address,
                'distance': seg.distance['text'],
                'duration': seg.duration['text'],
                'mode': seg.mode
            } for seg in self.segments]
        }