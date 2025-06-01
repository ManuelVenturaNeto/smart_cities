from flask import Flask
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
    app.config['GOOGLE_MAPS_KEY'] = os.getenv('GOOGLE_MAPS_SERVER_KEY')
    
    # Import and register blueprints here to avoid circular imports
    from src.main.routes.routes import routes_bp
    app.register_blueprint(routes_bp)
    
    return app