import logging
import os
from logging.handlers import RotatingFileHandler
from flask import Flask
from dotenv import load_dotenv

load_dotenv()


def create_app():
    """
    Create and configure the Flask application.
    """
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY")
    app.config["GOOGLE_MAPS_KEY"] = os.getenv("GOOGLE_MAPS_SERVER_KEY")

    # Configure logging
    configure_logging(app)

    # Import and register blueprints
    from src.main.routes.routes import routes_bp

    app.register_blueprint(routes_bp)

    return app


def configure_logging(app):
    """
    Configure logging for the Flask application.
    """
    # Remove default handlers
    for handler in app.logger.handlers:
        app.logger.removeHandler(handler)

    # Set log level
    log_level = logging.DEBUG if app.debug else logging.INFO
    app.logger.setLevel(log_level)

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    app.logger.addHandler(console_handler)

    # File handler (rotating logs)
    file_handler = RotatingFileHandler(
        "smart_cities.log", maxBytes=1024 * 1024, backupCount=10
    )
    file_handler.setFormatter(formatter)
    app.logger.addHandler(file_handler)

    # Log startup message
    app.logger.info("Application startup")
