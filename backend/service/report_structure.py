from typing import List, Optional, Dict, Any
from sqlmodel import select
from models.it_report_structures import ItReportStructure
from config.database import get_session
from datetime import datetime
import json
import re
from utils.sql_parser import generate_jrxml_from_query
import logging

logger = logging.getLogger(__name__)

class ReportStructureService:
        
    def get_report_structure_by_id(self, report_id: int) -> Optional[ItReportStructure]:
        """
        Get a single report structure by ID
        
        Args:
            report_id: The ID of the report structure
            
        Returns:
            ItReportStructure object if found, None otherwise
        """
        with get_session() as session:
            statement = select(ItReportStructure).where(ItReportStructure.id == report_id)
            result = session.exec(statement).first()
            return result
    
    
    def generate_jrxml_json_from_query(self, base_query: str) -> Dict[str, Any]:
        """
        Generate JRXML JSON structure from a base SQL query
        
        Args:
            base_query: The SQL SELECT query
            
        Returns:
            Dictionary containing the JRXML JSON structure
        """
        return generate_jrxml_from_query(base_query)


    def update_json_form_and_jrxml(self, report_id: int, json_form_data: Dict[str, Any], jrxml_data: Dict[str, Any]) -> bool:
        """
        Update json_form and jrxml_json for a specific report structure.
        Ensures that report_name is synchronized between json_form and jrxml_json.

        Args:
            report_id: The ID of the report to update
            json_form_data: The data to store in json_form
            jrxml_data: The data to store in jrxml_json

        Returns:
            bool: True if update was successful, False otherwise
        """
        try:
            with get_session() as session:
                structure = session.get(ItReportStructure, report_id)
                if not structure:
                    return False
                
                # Extract report_name from json_form_data (config)
                report_name = json_form_data.get('reportName', '')
                
                # Update json_form
                structure.json_form = json.dumps(json_form_data, ensure_ascii=False)
                
                # Update jrxml_json and ensure report_name is synchronized
                if jrxml_data is not None:
                    # Ensure report_name is set in jrxml_data
                    jrxml_data['report_name'] = report_name
                    structure.jrxml_json = json.dumps(jrxml_data, ensure_ascii=False)
                else:
                    # If jrxml_data is None, try to update existing jrxml_json with report_name
                    if structure.jrxml_json:
                        try:
                            existing_jrxml = json.loads(structure.jrxml_json)
                            existing_jrxml['report_name'] = report_name
                            structure.jrxml_json = json.dumps(existing_jrxml, ensure_ascii=False)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse existing jrxml_json for report {report_id}")
                
                structure.updated_at = datetime.utcnow()
                session.add(structure)
                # Session will commit automatically via the context manager
            return True
        except Exception as e:
            logger.error(f"Error updating json_form/jrxml_json: {str(e)}")
            return False


    def get_json_form(self) -> Dict[str, Any]:
        """Get json_form for the single report as a dictionary"""
        structure = self.get_report_structure()
        if structure and structure.json_form:
            try:
                return json.loads(structure.json_form)
            except json.JSONDecodeError:
                return {}
        return {}

    def get_json_schema(self) -> Dict[str, Any]:
        structure = self.get_report_structure()
        if structure and structure.json_schema:
            try:
                return json.loads(structure.json_schema)
            except json.JSONDecodeError:
                return {}
        return {}

    def get_placeholder_data(self) -> Dict[str, Any]:
        structure = self.get_report_structure()
        if structure and structure.placeholder_data:
            try:
                return json.loads(structure.placeholder_data)
            except json.JSONDecodeError:
                return {}
        return {}


    def get_jrxml_json(self, report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get jrxml_json for a specific report ID from request data"""
        report_id = report_data.get('id')
        if not report_id:
            return None
        
        with get_session() as session:
            structure = session.get(ItReportStructure, report_id)
            if not structure or not structure.jrxml_json:
                return None
            try:
                return json.loads(structure.jrxml_json)
            except json.JSONDecodeError:
                return None