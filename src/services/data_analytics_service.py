# src/services/data_service.py
import logging
import json
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class DataService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.available_datasets = {
            "estacionamento_publico_pessoa_idosa": "Older-Adult Parking",
            "estacionamento_rotativo": "Paid/Rotative Parking",
            "fiscalizacao_eletronica": "Electronic Enforcement",
            "posto_venda_rotativo": "Rotative Ticket Booths",
            "rede_prioritaria_onibus": "Bus Priority Network",
            "redutor_velocidade": "Speed Humps",
            "sinalizacao_semaforica": "Traffic Signals",
            "sinistro_transito_vitima": "Traffic Accidents",
            "trecho_no_circulacao": "Non-Circulating Road Segments",
        }

    def get_available_datasets(self) -> Dict[str, str]:
        return self.available_datasets

    def load_dataset(
        self, dataset_name: str, page: int = 1, per_page: int = 100
    ) -> Optional[Dict]:
        if dataset_name not in self.available_datasets:
            return None

        try:
            file_path = Path(self.data_dir) / f"{dataset_name}.json"
            with open(file_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                processed_data = self._process_data(raw_data)

                # Apply pagination
                total_records = len(processed_data["records"])
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_records = processed_data["records"][start_idx:end_idx]

                # Get dataset-specific analytics
                analytics = self._get_dataset_analytics(
                    dataset_name, processed_data["records"]
                )

                return {
                    "fields": processed_data["fields"],
                    "records": paginated_records,
                    "total_records": total_records,
                    "page": page,
                    "per_page": per_page,
                    "analytics": analytics,
                }
        except Exception as e:
            logger.error(f"Error loading dataset {dataset_name}: {str(e)}")
            return None

    def _process_data(self, raw_data: Dict) -> Dict:
        fields = [field["id"] for field in raw_data.get("fields", [])]
        records = raw_data.get("records", [])

        processed_records = []
        for record in records:
            processed_record = {}
            for i, field in enumerate(fields):
                if i < len(record):
                    processed_record[field] = record[i]
                else:
                    processed_record[field] = None
            processed_records.append(processed_record)

        return {"fields": fields, "records": processed_records}

    def _get_dataset_analytics(self, dataset_name: str, records: List[Dict]) -> Dict:
        analytics = {}

        if dataset_name == "estacionamento_publico_pessoa_idosa":
            # Older-Adult Parking analytics
            analytics["bairro_counts"] = self._count_by_field(records, "BAIRRO")
            analytics["tempo_permanencia_counts"] = self._count_by_field(
                records, "TEMPO_PERMANENCIA"
            )
            analytics["vagas_comparison"] = {
                "fisicas": sum(int(r.get("NUMERO_VAGAS_FISICAS", 0)) for r in records),
                "rotativas": sum(
                    int(r.get("NUMERO_VAGAS_ROTATIVAS", 0)) for r in records
                ),
            }

        elif dataset_name == "estacionamento_rotativo":
            # Paid/Rotative Parking analytics
            analytics["bairro_counts"] = self._count_by_field(records, "BAIRRO")
            analytics["tempo_permanencia_counts"] = self._count_by_field(
                records, "TEMPO_PERMANENCIA"
            )
            analytics["dia_operacao_counts"] = self._count_by_field(
                records, "DIA_REGRA_OPERACAO"
            )
            analytics["vagas_comparison"] = {
                "fisicas": sum(int(r.get("NUMERO_VAGAS_FISICAS", 0)) for r in records),
                "rotativas": sum(
                    int(r.get("NUMERO_VAGAS_ROTATIVAS", 0)) for r in records
                ),
            }

        elif dataset_name == "fiscalizacao_eletronica":
            # Electronic Enforcement analytics
            analytics["tipo_controlador_counts"] = self._count_by_field(
                records, "DESC_TIPO_CONTROLADOR_TRANSITO"
            )
            analytics["sentido_counts"] = self._count_by_field(records, "SENTIDO")

        elif dataset_name == "posto_venda_rotativo":
            # Rotative Ticket Booths analytics
            analytics["endereco_counts"] = self._count_by_field(records, "ENDERECO")

        elif dataset_name == "rede_prioritaria_onibus":
            # Bus Priority Network analytics
            analytics["infraestrutura_counts"] = self._count_by_field(
                records, "INFRAESTRUTURA_PREDOMINANTE"
            )
            analytics["total_extensao"] = sum(
                float(r.get("EXTENSAO_TRECHO", 0)) for r in records
            )
            analytics["ano_implantacao_counts"] = self._count_by_field(
                records, "ANO_IMPLANT_INFRA_ATUAL"
            )

        elif dataset_name == "redutor_velocidade":
            # Speed Humps analytics
            analytics["bairro_counts"] = self._count_by_field(records, "BAIRRO")
            analytics["implantacao_years"] = self._count_by_year(
                records, "DATA_IMPLANTACAO"
            )
            analytics["manutencao_years"] = self._count_by_year(
                records, "DATA_ULTIMA_MANUTENCAO"
            )

        elif dataset_name == "sinalizacao_semaforica":
            # Traffic Signals analytics
            analytics["tipo_travessia_counts"] = self._count_by_field(
                records, "TP_TRAVESSIA_PEDESTRE"
            )
            analytics["botoeira_counts"] = self._count_by_field(records, "BOTOEIRA")
            analytics["botoeira_sonora_counts"] = self._count_by_field(
                records, "BOTOEIRA_SONORA"
            )
            analytics["media_faixas_veiculo"] = self._average_by_field(
                records, "QTD_TR_C_FOCO"
            )
            analytics["media_faixas_pedestre"] = self._average_by_field(
                records, "QTD_TR_S_FOCO"
            )

        elif dataset_name == "sinistro_transito_vitima":
            # Traffic Accidents analytics
            analytics["tipo_acidente_counts"] = self._count_by_field(
                records, "DESCRICAO_TIPO_ACIDENTE"
            )
            analytics["regional_counts"] = self._count_by_field(
                records, "DESCRICAO_REGIONAL"
            )
            analytics["fatalidade_counts"] = self._count_by_field(
                records, "INDICADOR_FATALIDADE"
            )
            analytics["acidentes_por_ano"] = self._count_by_year(
                records, "DATA_HORA_BOLETIM"
            )

        elif dataset_name == "trecho_no_circulacao":
            # Non-Circulating Road Segments analytics
            pass  # Just need the points for mapping

        return analytics

    def _count_by_field(self, records: List[Dict], field_name: str) -> Dict:
        counts = {}
        for record in records:
            value = record.get(field_name, "Unknown")
            counts[value] = counts.get(value, 0) + 1
        return counts

    def _count_by_year(self, records: List[Dict], date_field: str) -> Dict:
        year_counts = {}
        for record in records:
            date_str = record.get(date_field)
            if date_str:
                try:
                    # Handle different date formats
                    if " " in date_str:
                        date_part = date_str.split(" ")[0]
                    else:
                        date_part = date_str

                    year = date_part.split("-")[0]
                    year_counts[year] = year_counts.get(year, 0) + 1
                except:
                    continue
        return year_counts

    def _average_by_field(self, records: List[Dict], field_name: str) -> float:
        total = 0
        count = 0
        for record in records:
            value = record.get(field_name)
            if value and str(value).isdigit():
                total += int(value)
                count += 1
        return total / count if count > 0 else 0
