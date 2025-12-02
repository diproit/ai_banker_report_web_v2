from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils.decorators import admin_required
from service.report_structure import ReportStructureService


report_structure_bp = Blueprint('report_structure', __name__)
report_service = ReportStructureService()

# Get single report structure by ID
@report_structure_bp.route('/<int:report_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_report_structure(report_id):
    """Get a single report structure by ID"""
    try:
        report_structure = report_service.get_report_structure_by_id(report_id)
        
        if not report_structure:
            return jsonify({
                "success": False,
                "message": "Report structure not found"
            }), 404
        
        # Convert the model to dictionary for JSON response
        report_data = {
            "id": report_structure.id,
            "description": report_structure.description,
            "base_query": report_structure.base_query,
            "json_form": report_structure.json_form,
            "json_schema": report_structure.json_schema,
            "placeholder_data": report_structure.placeholder_data,
            "jrxml_json": report_structure.jrxml_json,
            "created_at": report_structure.created_at.isoformat() if report_structure.created_at else None,
            "updated_at": report_structure.updated_at.isoformat() if report_structure.updated_at else None,
            "is_active": report_structure.is_active
        }
        
        return jsonify({
            "success": True,
            "data": report_data,
            "message": "Report structure retrieved successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error retrieving report structure: {str(e)}"
        }), 500

# Save config (json_form) for the single report structure
@report_structure_bp.route('/<int:report_id>/config', methods=['PUT'])
@jwt_required()
@admin_required
def update_report_config(report_id):
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        config_data = payload.get("config")
        updated_config_data = payload.get("updatedConfig")

        if not config_data:
            return jsonify({"success": False, "message": "Config is required"}), 400

        success = report_service.update_json_form_and_jrxml(report_id, config_data, updated_config_data)
        if not success:
            return jsonify({"success": False, "message": "Report not found or update failed"}), 404

        return jsonify({"success": True, "message": "Configuration updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error updating configuration: {str(e)}"}), 500


@report_structure_bp.route('/generate-jrxml', methods=['POST'])
@jwt_required()
@admin_required
def generate_jrxml_json():
    """Generate jrxml_json from a base SQL query"""
    try:
        data = request.get_json()
        if not data or 'base_query' not in data:
            return jsonify({
                "success": False,
                "message": "base_query is required in the request body"
            }), 400
        
        base_query = data['base_query']
        
        jrxml_json = report_service.generate_jrxml_json_from_query(base_query)
        
        return jsonify({
            "success": True,
            "data": jrxml_json,
            "message": "JRXML JSON generated successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error generating jrxml_json: {str(e)}"
        }), 500
    

@report_structure_bp.route('/base-query', methods=['POST'])
@jwt_required()
@admin_required
def get_base_query_by_id():
    """
    Get base_query by report structure ID with query structure analysis
    Request body: {"id": 1}
    """
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            return jsonify({"success": False, "message": "Report structure ID is required"}), 400
            
        structure = report_service.get_report_structure_by_id(data['id'])
        if not structure:
            return jsonify({"success": False, "message": "Report structure not found"}), 404
        
        # Get query structure analysis
        from utils.sql_parser import SQLQueryExtractor
        extractor = SQLQueryExtractor()
        query_structure = extractor.extract_query_structure(structure.base_query)
        
        return jsonify({
            "success": True,
            "data": {
                "id": structure.id,
                "base_query": structure.base_query,
                "description": structure.description,
                "query_structure": query_structure,
                "jrxml_json": structure.jrxml_json
            }
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error retrieving base query: {str(e)}"}), 500

@report_structure_bp.route('/jrxml', methods=['POST'])
@jwt_required()
@admin_required
def get_jrxml_json():
    """Get jrxml_json for a specific report ID (POST method)"""
    try:
        report_data = request.get_json()
        if not report_data or 'id' not in report_data:
            return jsonify({
                "success": False,
                "message": "Report ID is required in the request body"
            }), 400
            
        jrxml_data = report_service.get_jrxml_json(report_data)
        if jrxml_data is None:
            return jsonify({
                "success": False,
                "message": "Report not found or jrxml_json not available"
            }), 404
            
        return jsonify({
            "success": True,
            "data": jrxml_data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error retrieving jrxml_json: {str(e)}"
        }), 500