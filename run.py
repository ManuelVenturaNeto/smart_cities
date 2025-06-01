import logging
from src.main.app import create_app

app = create_app()

if __name__ == "__main__":
    # Configure root logger
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True)
