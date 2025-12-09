from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from service.report_structure import ReportStructureService
from service.dynamic_ui import DynamicUIService
from typing import List, Dict, Any

dynamic_ui_bp = Blueprint('dynamic_ui', __name__)
dynamic_ui_service = DynamicUIService()

@dynamic_ui_bp.route('/config', methods=['POST'])
@jwt_required()
def get_report_config():
    """Fetch the json_form for a given report structure id"""
    try:
        report_data = request.get_json()
        print("Report Data:", report_data)
        config = dynamic_ui_service.get_report_config_by_id(report_data)
        if config is None:
            return jsonify({"success": False, "message": "Report structure not found or invalid JSON"}), 404
        return jsonify({"success": True, "config": config})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error retrieving report config: {str(e)}"}), 500


@dynamic_ui_bp.route('/table_data', methods=['POST'])
@jwt_required()
def get_table_data():
    """Fetch the table data for a given report structure id"""
    try:
        report_data = request.get_json()
        if report_data.get("reportID") is None:
            return jsonify({"success": False, "message": "Payload is missing"}), 400

        if report_data.get("params") != '':
         params = report_data.get("params")
         reportid = report_data.get("reportID") 
         print("reportid:", reportid)
         print("params:", params)
         base_sql = dynamic_ui_service.get_table_base_query_by_id(reportid)
         table_sql = dynamic_ui_service.replace_where_values(base_sql.get("originalBaseQuery"), params)
         
        else:
         base_sql = dynamic_ui_service.get_table_base_query_by_id(report_data.get("reportid"))
         table_sql = base_sql.get("originalBaseQuery")    
         if table_sql is None:
            return jsonify({"success": False, "message": "Report structure not found or invalid JSON"}), 404

        table_data = dynamic_ui_service.get_table_data_by_sql(table_sql)
        print("table_data:", table_data)
        print("table_data rows:", table_data.get("rows"))
        if table_data is None:
            return jsonify({"success": False, "message": "Report structure not found or invalid JSON"}), 404

        columns = list(table_data["rows"][0].keys()) if table_data.get("rows") else []
        return jsonify({
            "success": True,
            "columns": columns,
            "table_data": table_data.get("rows")
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Error retrieving report config: {str(e)}"}), 500


@dynamic_ui_bp.route('/save-config', methods=['POST'])
@jwt_required()
def save_config():
    """Save the json_form for a given report structure id"""
    try:
        report_data = request.get_json()
        if report_data is None:
            return jsonify({"success": False, "message": "Payload is missing"}), 400
        print("Report Data:", report_data)
        print("Report Data get:", report_data.get("rows"))
        config = dynamic_ui_service.save_config(report_data)
        if config is None:
            return jsonify({"success": False, "message": "Report structure not found or invalid JSON"}), 404
        return jsonify({"success": True, "config": config})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error retrieving report config: {str(e)}"}), 500

@dynamic_ui_bp.route('/update-config', methods=['POST'])
@jwt_required()
def update_config():
    print("Starting update_config")
    """Create or update a saved configuration."""
    try:
        report_data = request.get_json()
        if report_data is None:
            return jsonify({"success": False, "message": "Payload is missing"}), 400

        #print("Incoming Report Config:", report_data)

        # Extract essential fields
        name = report_data.get("name")
        report_id = report_data.get("reportId")
        user_id = report_data.get("userId")
        branch_id = report_data.get("branchId")
        config_json = report_data.get("config")
        description = report_data.get("description", "")
        timestamp = report_data.get("timestamp")

        if not (name and report_id and user_id and config_json):
            return jsonify({
                "success": False,
                "message": "Missing required fields (name, reportId, userId, config)"
            }), 400

        # --- Check if config already exists for same user, report & name ---
        existing_config = dynamic_ui_service.get_config_by_name(name, report_id, user_id, branch_id)

        if existing_config:
            # --- Update existing config ---
            updated_config = dynamic_ui_service.update_config(
                config_id=existing_config.id,
                new_config=config_json,
                description=description,
                timestamp=timestamp
            )
            if updated_config:
                return jsonify({
                    "success": True,
                    "message": f"Configuration '{name}' updated successfully.",
                    "config": updated_config
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "Failed to update configuration in database."
                }), 500

        # --- If not found, save as new ---
        new_config = dynamic_ui_service.save_config(report_data)
        if new_config is None:
            return jsonify({
                "success": False,
                "message": "Failed to create new configuration."
            }), 500

        return jsonify({
            "success": True,
            "message": f"New configuration '{name}' created successfully.",
            "config": new_config
        })

    except Exception as e:
        print("Error while updating config:", e)
        return jsonify({
            "success": False,
            "message": f"Server error while updating configuration: {str(e)}"
        }), 500

@dynamic_ui_bp.route('/delete-config', methods=['POST'])
@jwt_required()
def delete_config():
    print("Starting delete_config")
    """Delete a saved configuration."""
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"success": False, "message": "Payload is missing"}), 400
        
        config_id = data.get("id")
        if not config_id or not isinstance(config_id, int):
            return jsonify({
                "success": False,
                "message": "Missing or invalid id (must be an integer)"
            }), 400
        
        success = dynamic_ui_service.delete_config(config_id)
        if success:
            return jsonify({
                "success": True,
                "message": "Configuration deleted successfully."
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to delete configuration (may not exist)."
            }), 404  # Or 500 if preferred for server error
    except Exception as e:
        print("Error while deleting config:", e)
        return jsonify({
            "success": False,
            "message": f"Server error while deleting configuration: {str(e)}"
        }), 500

@dynamic_ui_bp.route('/run-query', methods=['POST'])
@jwt_required()
def run_query():
    """Run a SQL query and return the results."""
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"success": False, "message": "Payload is missing"}), 400
        
        sql = data.get("sql")
        if not sql or not isinstance(sql, str):
            return jsonify({
                "success": False,
                "message": "Missing or invalid sql (must be a string)"
            }), 400
        
        result = dynamic_ui_service.get_table_data_by_sql(sql)
        if result:
            return jsonify({
                "success": True,
                "message": "Query executed successfully.",
                "result": result
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to delete configuration (may not exist)."
            }), 404  # Or 500 if preferred for server error
    except Exception as e:
        print("Error while deleting config:", e)
        return jsonify({
            "success": False,
            "message": f"Server error while deleting configuration: {str(e)}"
        }), 500


