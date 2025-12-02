from flask import Flask, make_response, request, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config.config import Config
from config.database import init_db
import logging

# Import models to ensure they're registered with SQLModel
from models.it_prompt_master import ItPromptMaster
from models.it_nav_menu import ItNavMenu
from models.it_report_structures import ItReportStructure
from models.it_user_nav_rights import ItUserNavRights
from models.it_language import ItLanguage
from models.it_user_master import ItUserMaster

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)

    @app.route("/")
    def home():
        return jsonify({"message": "API is running"}), 200

    # Load configuration
    app.config.from_object(Config)
    
    # Validate configurations
    Config.validate_ai_config()
    Config.validate_db_config()
    
    # Initialize extensions
    jwt = JWTManager(app)
    
    # Initialize database and create tables
    with app.app_context():
        if not init_db(app):
            logger.error("Failed to initialize database")
            raise RuntimeError("Database initialization failed")
    
    # Enable CORS with credentials support for HTTP-only cookies
    # Accept both localhost and 127.0.0.1 for Docker compatibility
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://api:5003"
    ]
    
    CORS(
        app,
        resources={
            r"/*": {
                "origins": ALLOWED_ORIGINS,  # frontend origins
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,  # Required for cookies
            }
        },
        supports_credentials=True,
    )

    # Ensure OPTIONS preflight always returns 200 with proper CORS headers.
    @app.before_request
    def handle_options_preflight():
        if request.method == 'OPTIONS':
            resp = make_response('', 200)
            origin = request.headers.get('Origin')
            if origin in ALLOWED_ORIGINS:
                resp.headers['Access-Control-Allow-Origin'] = origin
            else:
                resp.headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0]
            resp.headers['Access-Control-Allow-Credentials'] = 'true'
            resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
            return resp
    
    # Register blueprints
    register_blueprints(app)
    
    return app

def register_blueprints(app):
    """Register all application blueprints"""
    from routes.auth import auth_bp
    from routes.chat import chat_bp
    from routes.nav import nav_bp
    from routes.report_structure import report_structure_bp
    from routes.sql_executor import sql_executor_bp
    from routes.dynamic_ui import dynamic_ui_bp
    from routes.user import user_bp
    from routes.report_design import report_design_bp
    from routes.user_rights import user_rights_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(chat_bp, url_prefix='/chat')
    app.register_blueprint(nav_bp, url_prefix='/nav')
    app.register_blueprint(report_structure_bp, url_prefix='/report-structure')
    app.register_blueprint(sql_executor_bp, url_prefix='/sql_executor')
    app.register_blueprint(dynamic_ui_bp, url_prefix='/dynamic-ui')
    app.register_blueprint(user_bp, url_prefix='/user-management')
    app.register_blueprint(report_design_bp, url_prefix='/report-design')
    app.register_blueprint(user_rights_bp, url_prefix='/user-rights')

# Create the Flask application
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5003)
