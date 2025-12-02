from typing import Optional, Dict, Any
from sqlmodel import select, insert
from models.it_report_structures import ItReportStructure
from models.it_report_design import ItReportDesign
from config.database import get_session
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ReportDesignService:

    def store_report_design(
        self,
        it_user_master_id: int,
        branch_id: int,
        it_report_structure_id: int,
        report_design_json: Dict[str, Any],
        report_design_name: str,
        is_active: int,
        created_at: datetime,
        updated_at: datetime
    ) -> Optional[ItReportDesign]:
        try:
            new_design = ItReportDesign(
                it_user_master_id=it_user_master_id,
                branch_id=branch_id,
                it_report_structure_id=it_report_structure_id,
                report_design_json=json.dumps(report_design_json),
                report_design_name=report_design_name,
                is_active=is_active,
                created_at=created_at,
                updated_at=updated_at
            )

            with get_session() as session:
                session.add(new_design)
                session.flush()  # Get the ID
            
            return new_design
        except Exception as e:
            print(f"Error storing report design: {e}")
            return None

    def get_report_design_by_id(
        self, it_user_master_id: int, it_report_structure_id: int
    ) -> Optional[list[Dict[str, Any]]]:
        try:
            with get_session() as session:
                # Use SQLModel select instead of session.query for consistency
                designs = session.exec(
                    select(ItReportDesign).where(
                        ItReportDesign.it_user_master_id == it_user_master_id,
                        ItReportDesign.it_report_structure_id == it_report_structure_id
                    )
                ).all()
                
                # Convert to dictionaries while still in session context
                design_list = [design.to_dict() for design in designs]
                return design_list
        except Exception as e:
            logger.error(f"Error getting report design by id: {e}")
            return None

