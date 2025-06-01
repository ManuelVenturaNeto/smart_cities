document.addEventListener('DOMContentLoaded', function() {
    let currentData = null;
    let currentDataset = '';
    let currentPage = 1;
    const perPage = 100;
    let barChart, pieChart, lineChart, mapChart;
    let map;
    let markers = [];
    let markerCluster;

    // Initialize map
    function initMap() {
        map = L.map('map-container').setView([-19.9227, -43.9451], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    initMap();

    // Load data when button is clicked
    document.getElementById('load-data').addEventListener('click', function() {
        currentPage = 1;
        const dataset = document.getElementById('dataset-select').value;
        loadDataset(dataset, currentPage);
    });

    // Pagination handlers
    document.getElementById('prev-page').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadDataset(currentDataset, currentPage);
        }
    });

    document.getElementById('next-page').addEventListener('click', function() {
        currentPage++;
        loadDataset(currentDataset, currentPage);
    });

    function loadDataset(dataset, page) {
        const loadingElement = document.getElementById('loading');
        loadingElement.style.display = 'flex';
        currentDataset = dataset;

        axios.get(`/get_dataset/${dataset}?page=${page}&per_page=${perPage}`)
            .then(response => {
                loadingElement.style.display = 'none';
                if (response.data.error) {
                    showError(response.data.error);
                    return;
                }
                currentData = response.data;
                renderCharts(currentData);
                renderTable(currentData);
                renderMap(currentData);
                updatePaginationInfo();
            })
            .catch(error => {
                console.error('Error loading dataset:', error);
                loadingElement.style.display = 'none';
                showError(`Error loading dataset: ${error.response?.data?.error || error.message}`);
            });
    }

    function updatePaginationInfo() {
        document.getElementById('page-info').textContent = 
            `Page ${currentData.page} of ${Math.ceil(currentData.total_records / perPage)}`;
        document.getElementById('total-records').textContent = 
            `Total records: ${currentData.total_records}`;
            
        document.getElementById('prev-page').disabled = currentData.page <= 1;
        document.getElementById('next-page').disabled = 
            currentData.page >= Math.ceil(currentData.total_records / perPage);
    }

    function renderCharts(data) {
        // Clear existing charts
        if (barChart) barChart.destroy();
        if (pieChart) pieChart.destroy();
        if (lineChart) lineChart.destroy();
        if (mapChart) mapChart.destroy();

        // Get the analytics data
        const analytics = data.analytics || {};

        // Create a container for dataset-specific charts
        const chartsContainer = document.getElementById('charts-container');
        chartsContainer.innerHTML = '<h2>Dataset Analytics</h2><div class="chart-grid"></div>';

        const chartGrid = chartsContainer.querySelector('.chart-grid');

        // Render dataset-specific visualizations
        switch(currentDataset) {
            case 'estacionamento_publico_pessoa_idosa':
                renderOlderAdultParkingCharts(analytics, chartGrid);
                break;
            case 'estacionamento_rotativo':
                renderRotativeParkingCharts(analytics, chartGrid);
                break;
            case 'fiscalizacao_eletronica':
                renderElectronicEnforcementCharts(analytics, chartGrid);
                break;
            case 'posto_venda_rotativo':
                renderTicketBoothsCharts(analytics, chartGrid);
                break;
            case 'rede_prioritaria_onibus':
                renderBusPriorityCharts(analytics, chartGrid);
                break;
            case 'redutor_velocidade':
                renderSpeedHumpsCharts(analytics, chartGrid);
                break;
            case 'sinalizacao_semaforica':
                renderTrafficSignalsCharts(analytics, chartGrid);
                break;
            case 'sinistro_transito_vitima':
                renderTrafficAccidentsCharts(analytics, chartGrid);
                break;
            case 'trecho_no_circulacao':
                renderNonCirculatingCharts(analytics, chartGrid);
                break;
        }
    }

    function renderOlderAdultParkingCharts(analytics, container) {
        // 1. Bar chart showing total number of spots per BAIRRO
        const bairroCtx = document.createElement('canvas');
        bairroCtx.height = 300;
        container.appendChild(createChartContainer('Parking Spots by Neighborhood', bairroCtx));
        
        const bairroLabels = Object.keys(analytics.bairro_counts || {});
        const bairroData = Object.values(analytics.bairro_counts || {});
        
        barChart = new Chart(bairroCtx, {
            type: 'bar',
            data: {
                labels: bairroLabels,
                datasets: [{
                    label: 'Number of Spots',
                    data: bairroData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Parking Spots by Neighborhood (BAIRRO)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Spots'
                        }
                    }
                }
            }
        });

        // 2. Pie chart showing physical vs rotative spots
        const vagasCtx = document.createElement('canvas');
        vagasCtx.height = 300;
        container.appendChild(createChartContainer('Physical vs Rotative Spots', vagasCtx));
        
        pieChart = new Chart(vagasCtx, {
            type: 'pie',
            data: {
                labels: ['Physical Spots', 'Rotative Spots'],
                datasets: [{
                    data: [
                        analytics.vagas_comparison?.fisicas || 0,
                        analytics.vagas_comparison?.rotativas || 0
                    ],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Physical vs Rotative Parking Spots'
                    }
                }
            }
        });

        // 3. Pie chart for time limits
        const tempoCtx = document.createElement('canvas');
        tempoCtx.height = 300;
        container.appendChild(createChartContainer('Parking Time Limits', tempoCtx));
        
        const tempoLabels = Object.keys(analytics.tempo_permanencia_counts || {});
        const tempoData = Object.values(analytics.tempo_permanencia_counts || {});
        
        pieChart = new Chart(tempoCtx, {
            type: 'pie',
            data: {
                labels: tempoLabels,
                datasets: [{
                    data: tempoData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Parking Time Limits (TEMPO_PERMANENCIA)'
                    }
                }
            }
        });
    }

    function renderRotativeParkingCharts(analytics, container) {
        // 1. Bar chart of total spots per BAIRRO
        const bairroCtx = document.createElement('canvas');
        bairroCtx.height = 300;
        container.appendChild(createChartContainer('Parking Spots by Neighborhood', bairroCtx));
        
        const bairroLabels = Object.keys(analytics.bairro_counts || {});
        const bairroData = Object.values(analytics.bairro_counts || {});
        
        barChart = new Chart(bairroCtx, {
            type: 'bar',
            data: {
                labels: bairroLabels,
                datasets: [{
                    label: 'Number of Spots',
                    data: bairroData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Parking Spots by Neighborhood (BAIRRO)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Spots'
                        }
                    }
                }
            }
        });

        // 2. Pie chart of operation days
        const diasCtx = document.createElement('canvas');
        diasCtx.height = 300;
        container.appendChild(createChartContainer('Operation Days', diasCtx));
        
        const diasLabels = Object.keys(analytics.dia_operacao_counts || {});
        const diasData = Object.values(analytics.dia_operacao_counts || {});
        
        pieChart = new Chart(diasCtx, {
            type: 'pie',
            data: {
                labels: diasLabels,
                datasets: [{
                    data: diasData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Operation Days (DIA_REGRA_OPERACAO)'
                    }
                }
            }
        });

        // 3. Bar chart of time limits
        const tempoCtx = document.createElement('canvas');
        tempoCtx.height = 300;
        container.appendChild(createChartContainer('Time Limits', tempoCtx));
        
        const tempoLabels = Object.keys(analytics.tempo_permanencia_counts || {});
        const tempoData = Object.values(analytics.tempo_permanencia_counts || {});
        
        barChart = new Chart(tempoCtx, {
            type: 'bar',
            data: {
                labels: tempoLabels,
                datasets: [{
                    label: 'Number of Spots',
                    data: tempoData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Parking Time Limits (TEMPO_PERMANENCIA)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Spots'
                        }
                    }
                }
            }
        });
    }

    function renderElectronicEnforcementCharts(analytics, container) {
        // 1. Bar chart of enforcement types
        const tipoCtx = document.createElement('canvas');
        tipoCtx.height = 300;
        container.appendChild(createChartContainer('Enforcement Types', tipoCtx));
        
        const tipoLabels = Object.keys(analytics.tipo_controlador_counts || {});
        const tipoData = Object.values(analytics.tipo_controlador_counts || {});
        
        barChart = new Chart(tipoCtx, {
            type: 'bar',
            data: {
                labels: tipoLabels,
                datasets: [{
                    label: 'Number of Devices',
                    data: tipoData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Electronic Enforcement Types (DESC_TIPO_CONTROLADOR_TRANSITO)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Devices'
                        }
                    }
                }
            }
        });

        // 2. Pie chart of enforcement directions
        const sentidoCtx = document.createElement('canvas');
        sentidoCtx.height = 300;
        container.appendChild(createChartContainer('Enforcement Directions', sentidoCtx));
        
        const sentidoLabels = Object.keys(analytics.sentido_counts || {});
        const sentidoData = Object.values(analytics.sentido_counts || {});
        
        pieChart = new Chart(sentidoCtx, {
            type: 'pie',
            data: {
                labels: sentidoLabels,
                datasets: [{
                    data: sentidoData,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Enforcement Directions (SENTIDO)'
                    }
                }
            }
        });
    }

    function renderTicketBoothsCharts(analytics, container) {
        // 1. Bar chart of ticket booths by address
        const enderecoCtx = document.createElement('canvas');
        enderecoCtx.height = 300;
        container.appendChild(createChartContainer('Ticket Booths by Address', enderecoCtx));
        
        const enderecoLabels = Object.keys(analytics.endereco_counts || {});
        const enderecoData = Object.values(analytics.endereco_counts || {});
        
        barChart = new Chart(enderecoCtx, {
            type: 'bar',
            data: {
                labels: enderecoLabels,
                datasets: [{
                    label: 'Number of Booths',
                    data: enderecoData,
                    backgroundColor: 'rgba(153, 102, 255, 0.7)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Ticket Booths by Address (ENDERECO)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Booths'
                        }
                    }
                }
            }
        });
    }

    function renderBusPriorityCharts(analytics, container) {
        // 1. Pie chart of infrastructure types
        const infraCtx = document.createElement('canvas');
        infraCtx.height = 300;
        container.appendChild(createChartContainer('Infrastructure Types', infraCtx));
        
        const infraLabels = Object.keys(analytics.infraestrutura_counts || {});
        const infraData = Object.values(analytics.infraestrutura_counts || {});
        
        pieChart = new Chart(infraCtx, {
            type: 'pie',
            data: {
                labels: infraLabels,
                datasets: [{
                    data: infraData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Bus Priority Infrastructure Types (INFRAESTRUTURA_PREDOMINANTE)'
                    }
                }
            }
        });

        // 2. Bar chart of implementation years
        const anoCtx = document.createElement('canvas');
        anoCtx.height = 300;
        container.appendChild(createChartContainer('Implementation Years', anoCtx));
        
        const anoLabels = Object.keys(analytics.ano_implantacao_counts || {}).sort();
        const anoData = Object.values(analytics.ano_implantacao_counts || {});
        
        barChart = new Chart(anoCtx, {
            type: 'bar',
            data: {
                labels: anoLabels,
                datasets: [{
                    label: 'Number of Segments',
                    data: anoData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Implementation Years (ANO_IMPLANT_INFRA_ATUAL)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Segments'
                        }
                    }
                }
            }
        });
    }

    function renderSpeedHumpsCharts(analytics, container) {
        // 1. Bar chart of speed humps by neighborhood
        const bairroCtx = document.createElement('canvas');
        bairroCtx.height = 300;
        container.appendChild(createChartContainer('Speed Humps by Neighborhood', bairroCtx));
        
        const bairroLabels = Object.keys(analytics.bairro_counts || {});
        const bairroData = Object.values(analytics.bairro_counts || {});
        
        barChart = new Chart(bairroCtx, {
            type: 'bar',
            data: {
                labels: bairroLabels,
                datasets: [{
                    label: 'Number of Speed Humps',
                    data: bairroData,
                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Speed Humps by Neighborhood (BAIRRO)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Speed Humps'
                        }
                    }
                }
            }
        });

        // 2. Line chart of installations by year
        const implantacaoCtx = document.createElement('canvas');
        implantacaoCtx.height = 300;
        container.appendChild(createChartContainer('Installations by Year', implantacaoCtx));
        
        const implantacaoLabels = Object.keys(analytics.implantacao_years || {}).sort();
        const implantacaoData = Object.values(analytics.implantacao_years || {});
        
        lineChart = new Chart(implantacaoCtx, {
            type: 'line',
            data: {
                labels: implantacaoLabels,
                datasets: [{
                    label: 'Number of Installations',
                    data: implantacaoData,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Speed Hump Installations by Year (DATA_IMPLANTACAO)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Installations'
                        }
                    }
                }
            }
        });
    }

    function renderTrafficSignalsCharts(analytics, container) {
        // 1. Bar chart of crossing types
        const travessiaCtx = document.createElement('canvas');
        travessiaCtx.height = 300;
        container.appendChild(createChartContainer('Crossing Types', travessiaCtx));
        
        const travessiaLabels = Object.keys(analytics.tipo_travessia_counts || {});
        const travessiaData = Object.values(analytics.tipo_travessia_counts || {});
        
        barChart = new Chart(travessiaCtx, {
            type: 'bar',
            data: {
                labels: travessiaLabels,
                datasets: [{
                    label: 'Number of Signals',
                    data: travessiaData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Traffic Signal Crossing Types (TP_TRAVESSIA_PEDESTRE)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Signals'
                        }
                    }
                }
            }
        });

        // 2. Pie chart of pedestrian buttons
        const botoeiraCtx = document.createElement('canvas');
        botoeiraCtx.height = 300;
        container.appendChild(createChartContainer('Pedestrian Buttons', botoeiraCtx));
        
        const botoeiraLabels = Object.keys(analytics.botoeira_counts || {});
        const botoeiraData = Object.values(analytics.botoeira_counts || {});
        
        pieChart = new Chart(botoeiraCtx, {
            type: 'pie',
            data: {
                labels: botoeiraLabels,
                datasets: [{
                    data: botoeiraData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Traffic Signals with Pedestrian Buttons (BOTOEIRA)'
                    }
                }
            }
        });
    }

    function renderTrafficAccidentsCharts(analytics, container) {
        // 1. Bar chart of accident types
        const tipoCtx = document.createElement('canvas');
        tipoCtx.height = 300;
        container.appendChild(createChartContainer('Accident Types', tipoCtx));
        
        const tipoLabels = Object.keys(analytics.tipo_acidente_counts || {});
        const tipoData = Object.values(analytics.tipo_acidente_counts || {});
        
        barChart = new Chart(tipoCtx, {
            type: 'bar',
            data: {
                labels: tipoLabels,
                datasets: [{
                    label: 'Number of Accidents',
                    data: tipoData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Traffic Accident Types (DESCRICAO_TIPO_ACIDENTE)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Accidents'
                        }
                    }
                }
            }
        });

        // 2. Bar chart of accidents by region
        const regionalCtx = document.createElement('canvas');
        regionalCtx.height = 300;
        container.appendChild(createChartContainer('Accidents by Region', regionalCtx));
        
        const regionalLabels = Object.keys(analytics.regional_counts || {});
        const regionalData = Object.values(analytics.regional_counts || {});
        
        barChart = new Chart(regionalCtx, {
            type: 'bar',
            data: {
                labels: regionalLabels,
                datasets: [{
                    label: 'Number of Accidents',
                    data: regionalData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Traffic Accidents by Region (DESCRICAO_REGIONAL)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Accidents'
                        }
                    }
                }
            }
        });

        // 3. Line chart of accidents by year
        const anosCtx = document.createElement('canvas');
        anosCtx.height = 300;
        container.appendChild(createChartContainer('Accidents by Year', anosCtx));
        
        const anosLabels = Object.keys(analytics.acidentes_por_ano || {}).sort();
        const anosData = Object.values(analytics.acidentes_por_ano || {});
        
        lineChart = new Chart(anosCtx, {
            type: 'line',
            data: {
                labels: anosLabels,
                datasets: [{
                    label: 'Number of Accidents',
                    data: anosData,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Traffic Accidents by Year (DATA_HORA_BOLETIM)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Accidents'
                        }
                    }
                }
            }
        });
    }

    function renderNonCirculatingCharts(analytics, container) {
        // Just show a message since we only need the map for this dataset
        const message = document.createElement('div');
        message.className = 'dataset-message';
        message.textContent = 'This dataset shows locations of non-circulating road segments. See the map below for spatial distribution.';
        container.appendChild(message);
    }

    function createChartContainer(title, canvas) {
        const container = document.createElement('div');
        container.className = 'chart-container';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        container.appendChild(titleEl);
        
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'chart-canvas-container';
        canvasContainer.appendChild(canvas);
        container.appendChild(canvasContainer);
        
        return container;
    }

    function renderTable(data) {
        // Clear existing table
        if ($.fn.DataTable.isDataTable('#data-table')) {
            $('#data-table').DataTable().destroy();
            $('#data-table').empty();
        }

        // Create table header
        const thead = $('#data-table thead');
        const headerRow = $('<tr></tr>');
        
        data.fields.forEach(field => {
            headerRow.append(`<th>${field}</th>`);
        });
        
        thead.empty().append(headerRow);

        // Create table body
        const tbody = $('#data-table tbody');
        tbody.empty();
        
        data.records.forEach(record => {
            const row = $('<tr></tr>');
            data.fields.forEach(field => {
                row.append(`<td>${record[field] || ''}</td>`);
            });
            tbody.append(row);
        });

        // Initialize DataTable with pagination
        $('#data-table').DataTable({
            paging: false,  // We're handling pagination ourselves
            info: false,
            searching: true,
            ordering: true,
            scrollX: true,
            responsive: true,
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf'
            ]
        });
    }

    function renderMap(data) {
        // Clear existing markers
        if (markerCluster) {
            map.removeLayer(markerCluster);
        }
        markers = [];

        // Initialize marker cluster group
        markerCluster = L.markerClusterGroup();

        // Check if we have geometry data
        const geometryField = data.fields.find(field => field === 'GEOMETRIA');
        if (!geometryField) return;

        // Parse geometry and add to map
        data.records.forEach(record => {
            const geom = record[geometryField];
            if (!geom) return;

            if (geom.startsWith('POINT')) {
                const coords = geom.match(/POINT \(([^)]+)\)/)[1].split(' ');
                const latLng = [parseFloat(coords[1]), parseFloat(coords[0])];
                
                let markerColor = 'blue';
                let markerIcon = L.Icon.Default;
                
                // Customize markers based on dataset
                switch(currentDataset) {
                    case 'estacionamento_publico_pessoa_idosa':
                        markerColor = record['TEMPO_PERMANENCIA']?.includes('LIVRE') ? 'green' : 'red';
                        break;
                    case 'sinistro_transito_vitima':
                        markerColor = record['INDICADOR_FATALIDADE'] === 'Sim' ? 'red' : 'orange';
                        break;
                    case 'fiscalizacao_eletronica':
                        markerColor = 'purple';
                        break;
                    default:
                        markerColor = 'blue';
                }

                markerIcon = new L.Icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                const marker = L.marker(latLng, {icon: markerIcon});
                markers.push(marker);
                
                // Add popup with record data
                let popupContent = `<b>${currentDataset}</b><br>`;
                for (const [key, value] of Object.entries(record)) {
                    if (key !== 'GEOMETRIA') {
                        popupContent += `${key}: ${value}<br>`;
                    }
                }
                marker.bindPopup(popupContent);
                markerCluster.addLayer(marker);
            }
            // Add handling for LINESTRING if needed
        });

        // Add markers to map
        map.addLayer(markerCluster);

        // Fit map to markers if we have any
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds());
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Remove any existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(err => err.remove());
        
        // Insert the error message
        document.querySelector('.container').prepend(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Load default dataset
    loadDataset('estacionamento_publico_pessoa_idosa', currentPage);
});