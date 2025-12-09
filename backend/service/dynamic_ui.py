from typing import Optional, Dict, Any
from sqlmodel import Session, select
from models.it_report_structures import ItReportStructure
from models.it_report_config import ItReportConfig
from config.database import get_engine
from service.sql_executor import SqlExecutorService
import json
import traceback
from datetime import datetime
import re

class DynamicUIService:
    def __init__(self):
        self.engine = get_engine()
        self.sql_executor_service = SqlExecutorService()

    def get_report_config_by_id(self, report_data: Dict[str, Any]) -> Optional[list[Dict[str, Any]]]:
        """
        Fetch the admin (original) and user configs for a given report structure.
        Returns a list of config objects with 'name' and 'cfg' keys.
        """
        try:
            print(f"[DEBUG] Getting report config for: {report_data}")
            with Session(self.engine) as session:
                # Fetch admin (original) config
                admincfg = session.exec(
                    select(ItReportStructure).where(ItReportStructure.id == report_data.get("id"))
                ).first()
                print(f"[DEBUG] Admin config found: {admincfg.json_form}")



                if not admincfg:
                    print(f"[ERROR] No report structure found with ID: {report_data.get('id')}")
                    return None

                if not admincfg.json_form:
                    print(f"[ERROR] Report structure {report_data.get('id')} has no json_form")
                    return None

                # Fetch all active user configs
                usercfg_list = session.exec(
                    select(ItReportConfig).where(
                        (ItReportConfig.it_user_master_id == report_data.get("it_user_master_id")) &
                        (ItReportConfig.it_report_structure_id == report_data.get("it_report_structure_id")) &
                        (ItReportConfig.branch_id == report_data.get("branchId")) &
                        (ItReportConfig.is_active == 1)
                    )
                ).all()

                print(f"[DEBUG] Found {len(usercfg_list)} user configs")

                configs: list[Dict[str, Any]] = []

                # Add the admin (original) config first
                try:
                    configs.append({
                        "name": "Original Configuration",
                        "cfg": json.loads(admincfg.json_form) if admincfg.json_form else {}
                    })
                except json.JSONDecodeError as e:
                    print(f"[ERROR] Failed to parse admin JSON: {e}")
                    return None

                # Add all user configs
                for cfg in usercfg_list:
                    try:
                        configs.append({
                            "name": cfg.report_cfg_name,
                            "cfg": json.loads(cfg.report_cfg_json) if cfg.report_cfg_json else {},
                            "id": cfg.id
                        })
                    except json.JSONDecodeError as e:
                        print(f"[ERROR] Failed to parse user config JSON for '{cfg.report_cfg_name}': {e}")
                        continue  # Skip invalid ones

                return configs if configs else None

        except Exception as e:
            print(f"[ERROR] Error in get_report_config_by_id: {str(e)}")
            traceback.print_exc()
            return None

    def get_table_base_query_by_id(self, report_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch the JSON form (baseQuery) for a given report structure ID.
        """
        try:
            with Session(self.engine) as session:
                report = session.exec(
                    select(ItReportStructure).where(ItReportStructure.id == report_id)
                ).first()

                if not report or not report.json_form:
                    print(f"[ERROR] No JSON form found for report ID: {report_id}")
                    return None

                json_data = json.loads(report.json_form)
                print(f"[DEBUG] JSON data: {json_data.get('modifiedQuery')}")
                return {"originalBaseQuery": json_data.get("originalBaseQuery")}

        except json.JSONDecodeError:
            print(f"[ERROR] Invalid JSON in report structure ID: {report_id}")
            return None
        except Exception as e:
            print(f"[ERROR] Error in get_table_base_query_by_id: {str(e)}")
            traceback.print_exc()
            return None

    def get_table_data_by_sql(self, sql: str) -> Optional[Dict[str, Any]]:
        """
        Execute the provided SQL query and return the results.
        """
        if not sql:
            print("[ERROR] Empty SQL string provided.")
            return None

        try:
            result = self.sql_executor_service.execute_query(sql)
            return result
        except Exception as e:
            print(f"[ERROR] Error executing SQL query: {str(e)}")
            traceback.print_exc()
            return None

    def save_config(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            with Session(self.engine) as session:
                json_form = json.dumps(report_data.get("config", {}))  # convert dict to JSON string

                new_config = ItReportConfig(
                    report_cfg_name=report_data.get("name"),
                    report_cfg_json=json_form,
                    it_report_structure_id=report_data.get("reportId"),
                    it_user_master_id=report_data.get("userId"),
                    is_active=True,
                    branch_id=report_data.get("branchId")
                )

                session.add(new_config)
                session.commit()
                session.refresh(new_config)

                return {"success": True, "configId": new_config.id}

        except Exception as e:
            print(f"[ERROR] Failed to insert report config: {str(e)}")
            traceback.print_exc()
            return {"success": False, "message": str(e)}

    def get_config_by_name(self, name: str, report_id: int, user_id: int, branch_id: int):
        """Fetch an existing configuration by name for a given user/report/branch."""
        try:
            with Session(self.engine) as session:
                config = (
                    session.query(ItReportConfig)
                    .filter(
                        ItReportConfig.report_cfg_name == name,
                        ItReportConfig.it_report_structure_id == report_id,
                        ItReportConfig.it_user_master_id == user_id,
                        ItReportConfig.branch_id == branch_id,
                        ItReportConfig.is_active == True
                    )
                    .first()
                )
                return config
        except Exception as e:
            print(f"[ERROR] Failed to fetch existing config: {str(e)}")
            traceback.print_exc()
            return None

    def update_config(self, config_id: int, new_config: Dict[str, Any], description: str, timestamp: str):
        """Update an existing configuration."""
        try:
            with Session(self.engine) as session:
                config = session.query(ItReportConfig).get(config_id)
                if not config:
                    return None

                config.report_cfg_json = json.dumps(new_config)
                try:
                    # Parse the ISO formatted timestamp string to a datetime object
                    dt_object = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    # Format the datetime object to 'YYYY-MM-DD HH:MM:SS' for MySQL compatibility
                    config.updated_at = dt_object.strftime('%Y-%m-%d %H:%M:%S')
                except ValueError:
                    # Fallback to current UTC time if the timestamp format is invalid
                    print(f"[WARNING] Invalid timestamp format received: {timestamp}. Using current UTC time.")
                    config.updated_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
                if hasattr(config, "description"):
                    config.description = description

                session.commit()
                session.refresh(config)

                return {
                    "id": config.id,
                    "name": config.report_cfg_name,
                    "config": json.loads(config.report_cfg_json),
                    "branch_id": config.branch_id,
                    "user_id": config.it_user_master_id,
                }

        except Exception as e:
            print(f"[ERROR] Failed to update report config: {str(e)}")
            traceback.print_exc()
            return None

    def delete_config(self, config_id: int) -> bool:
        """Soft delete an existing configuration by setting is_active to 0."""
        try:
            with Session(self.engine) as session:
                # 1. Find the configuration
                config = session.query(ItReportConfig).get(config_id)
                if not config:
                    # Configuration not found
                    return False
                    
                # 2. Perform soft delete by setting is_active to 0
                config.is_active = 0
                # Optionally update a timestamp field here if your model has one
                # config.updated_at = datetime.utcnow() 

                session.commit()
                return True
        except Exception as e:
            # 3. Error Handling (This part was likely causing your SyntaxError due to bad indentation)
            print(f"[ERROR] Failed to soft delete report config ID {config_id}: {str(e)}")
            session.rollback() # Rollback transaction in case of database error
            return False # Deletion failed

        print(f"[ERROR] Failed to soft delete report config: {str(e)}")
        traceback.print_exc()
        return False

    def replace_where_values(self, base_sql: str, filter_values: list[dict]) -> str:
        """
        Replace the values in a SQL WHERE clause using filter_values.
        filter_values: [{"name": "column_name", "value": "value"}, ...]
        Only replaces inside the WHERE clause.
        """
        print(f"[DEBUG] Base SQL: {base_sql}")
        print(f"[DEBUG] Filter Values: {filter_values}")
        if not base_sql or not filter_values:
            return base_sql

        try:
            # Convert list to dict for quick lookup
            filter_dict = {item["name"]: item["value"] for item in filter_values if "name" in item and "value" in item}

            # Find WHERE clause
            match_where = re.search(r'\bWHERE\b(.*?)(\bORDER\s+BY\b|\bGROUP\s+BY\b|$)', base_sql, flags=re.IGNORECASE | re.DOTALL)
            if not match_where:
                return base_sql  # No WHERE clause

            where_clause = match_where.group(1)
            suffix = match_where.group(2)  # ORDER BY / GROUP BY / or empty

            # Replace only column = value patterns
            def replacer(match):
                try:
                    column = match.group("col")
                    if column in filter_dict:
                        value = filter_dict[column]
                        # Wrap strings in quotes if not numeric
                        if isinstance(value, str) and not value.isnumeric():
                            value = f"'{value}'"
                        return f"{column} = {value}"
                    return match.group(0)
                except Exception as e_inner:
                    print(f"[ERROR] Failed to replace value for '{match.group(0)}': {str(e_inner)}")
                    return match.group(0)

            # Regex to match column = something
            pattern = re.compile(r"(?P<col>\w+(\.\w+)*)\s*=\s*[^ \n]+")
            new_where_clause = pattern.sub(replacer, where_clause)

            # Reconstruct full SQL
            start_sql = base_sql[:match_where.start(1)]
            end_sql = base_sql[match_where.end(1):]
            print(f"[DEBUG] New WHERE Clause: {start_sql}{new_where_clause}{end_sql}")
            return f"{start_sql}{new_where_clause}{end_sql}"

        except Exception as e:
            print(f"[ERROR] Failed to replace WHERE clause values: {str(e)}")
            traceback.print_exc()
            return base_sql
