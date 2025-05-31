# run.py
from src.main.app import create_app

# Apenas importa e executa a fábrica de app do Flask
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
