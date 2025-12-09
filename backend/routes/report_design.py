from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from service.report_design import ReportDesignService

report_design_bp = Blueprint('report_design', __name__)
report_design_service = ReportDesignService()

@report_design_bp.route('/json_store', methods=['POST','OPTIONS'])
@jwt_required()
def store_json_to_table():

    try:
        
        request_data = request.get_json()
        if not request_data: 
            return jsonify({"success": False, "message": "No JSON payload provided"}), 400
        required_fields = [
            "it_user_master_id",
            "branch_id",
            "it_report_structure_id",
            "report_design_json",
            "report_design_name",
            "is_active",
            "created_at",
            "updated_at"
        ]
        if not all(field in request_data for field in required_fields):
            return jsonify({"success": False, "message": "Missing one or more required fields"}), 400

        created_design = report_design_service.store_report_design(
            it_user_master_id=request_data["it_user_master_id"],
            branch_id=request_data["branch_id"],
            it_report_structure_id=request_data["it_report_structure_id"],
            report_design_json=request_data["report_design_json"],
            report_design_name=request_data["report_design_name"],
            is_active=request_data["is_active"],
            created_at=request_data["created_at"],
            updated_at=request_data["updated_at"]
        )

        if created_design is None:
            return jsonify({"success": False, "message": "Failed to store report design"}), 500
        
        return jsonify({"success": True, "message": "Report design stored successfully", "design_id": created_design.id})

    except Exception as e:
        return jsonify({"success": False, "message": f"Error storing report design: {str(e)}"}), 500

@report_design_bp.route('/json_load', methods=['POST'])
@jwt_required()
def load_json_from_table():

    try:
        request_data = request.get_json()
        if not request_data: 
            return jsonify({"success": False, "message": "No id provided"}), 400
        required_fields = [
            "it_user_master_id",
            "it_report_structure_id"
        ]
        if not all(field in request_data for field in required_fields):
            return jsonify({"success": False, "message": "Missing one or more required fields"}), 400

        design_list = report_design_service.get_report_design_by_id(
            it_user_master_id=request_data["it_user_master_id"],
            it_report_structure_id=request_data["it_report_structure_id"]
        )
        
        if design_list is None:
            return jsonify({"success": False, "message": "Failed to load report design"}), 500
        
        return jsonify({"success": True, "message": "Report design loaded successfully", "data": design_list})

    except Exception as e:
        return jsonify({"success": False, "message": f"Error loading report design: {str(e)}"}), 500
