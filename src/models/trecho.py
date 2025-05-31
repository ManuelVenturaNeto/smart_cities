# src/main/services/trecho.py
class Trecho:
    def __init__(self, id_tcv, logradouro, lat_inicio, lng_inicio, lat_fim, lng_fim):
        self.id_tcv = id_tcv
        self.logradouro = logradouro
        self.lat_inicio = lat_inicio
        self.lng_inicio = lng_inicio
        self.lat_fim = lat_fim
        self.lng_fim = lng_fim
