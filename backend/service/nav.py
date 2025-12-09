from typing import List, Dict, Optional
from sqlmodel import Session, select, delete, and_, or_, func
from config.database import get_session
from models.it_nav_menu import NavPathHelper, ItNavMenu
from models.it_user_nav_rights import ItUserNavRights
from models.it_report_structures import ItReportStructure
from service.report_structure import ReportStructureService
from utils.sql_parser import JRXMLJsonGenerator, BaseQueryValidationError
import logging
import json
from datetime import datetime
import re


logger = logging.getLogger(__name__)

class NavService:
    def __init__(self):
        self.report_service = ReportStructureService()
    
    def get_localized_title(self, item_data: Dict, language: str = 'en') -> str:
        """Get the localized title based on language preference"""
        if language == 'si' and item_data.get('title_si'):
            return item_data['title_si']
        elif language == 'ta' and item_data.get('title_ta'):
            return item_data['title_ta']
        elif language == 'tl' and item_data.get('title_tl'):
            return item_data['title_tl']
        elif language == 'th' and item_data.get('title_th'):
            return item_data['title_th']
        return item_data.get('title', item_data.get('original_title', ''))
    
    def _get_title_field_for_language(self, language: str, alias: str = 'n') -> str:
        """Get the SQL field expression for the title based on language"""
        if language == 'si':
            return f'COALESCE({alias}.title_si, {alias}.title)'
        elif language == 'ta':
            return f'COALESCE({alias}.title_ta, {alias}.title)'
        elif language == 'tl':
            return f'COALESCE({alias}.title_tl, {alias}.title)'
        elif language == 'th':
            return f'COALESCE({alias}.title_th, {alias}.title)'
        else:
            return f'{alias}.title'
    
    def get_user_navigation(self, user_id: int, language: str = 'en') -> List[Dict]:
        logging.info(f"Fetching nav items for user_id={user_id}")
        
        try:
            with get_session() as session:
                # First, get all menu item IDs the user has access to (for child checking)
                accessible_items_stmt = select(ItNavMenu.id, ItNavMenu.path).select_from(
                    ItNavMenu.__table__.join(
                        ItUserNavRights.__table__,
                        ItNavMenu.id == ItUserNavRights.nav_menu_id
                    )
                ).where(
                    and_(
                        ItUserNavRights.user_id == user_id,
                        ItUserNavRights.can_view == True,
                        ItNavMenu.is_active == True
                    )
                )
                accessible_items = session.exec(accessible_items_stmt).all()
                accessible_ids = set(row.id for row in accessible_items)
                accessible_paths = set(row.path for row in accessible_items)
                
                # Main query with LEFT JOIN
                stmt = select(
                    ItNavMenu.id,
                    ItNavMenu.url,
                    ItNavMenu.parent_id,
                    ItNavMenu.level,
                    ItNavMenu.path,
                    ItNavMenu.group_name,
                    ItNavMenu.sort_order,
                    ItNavMenu.it_report_structures_id,
                    ItNavMenu.has_children,
                    ItNavMenu.is_active,
                    ItNavMenu.created_at,
                    ItNavMenu.updated_at,
                    ItNavMenu.title,
                    ItNavMenu.title_si,
                    ItNavMenu.title_ta,
                    ItNavMenu.title_tl,
                    ItNavMenu.title_th,
                    ItUserNavRights.nav_menu_id.label('user_has_access_direct')
                ).select_from(
                    ItNavMenu.__table__.outerjoin(
                        ItUserNavRights.__table__,
                        and_(
                            ItNavMenu.id == ItUserNavRights.nav_menu_id,
                            ItUserNavRights.user_id == user_id,
                            ItUserNavRights.can_view == True
                        )
                    )
                ).where(ItNavMenu.is_active == True)
                
                results = session.exec(stmt).all()
                
                # Process results to check for child access
                items_data = []
                for row in results:
                    # Check if user has direct access
                    has_direct_access = row.id in accessible_ids
                    
                    # Check if user has access to children using pre-fetched paths
                    has_child_access = False
                    if not has_direct_access and row.has_children:
                        # Check if any accessible path starts with this item's path
                        row_path = row.path
                        has_child_access = any(
                            path.startswith(row_path) and path != row_path 
                            for path in accessible_paths
                        )
                    
                    # Only include items where user has direct access or child access
                    if has_direct_access or has_child_access:
                        item_dict = {
                            'id': row.id,
                            'url': row.url,
                            'parent_id': row.parent_id,
                            'level': row.level,
                            'path': row.path,
                            'group_name': row.group_name,
                            'sort_order': row.sort_order,
                            'it_report_structures_id': row.it_report_structures_id,
                            'has_children': row.has_children,
                            'is_active': row.is_active,
                            'created_at': row.created_at,
                            'updated_at': row.updated_at,
                            'original_title': row.title,
                            'title_si': row.title_si,
                            'title_ta': row.title_ta,
                            'title_tl': row.title_tl,
                            'title_th': row.title_th,
                            'user_has_access': has_direct_access
                        }
                        
                        # Get localized title
                        item_dict['title'] = self.get_localized_title(item_dict, language)
                        items_data.append(item_dict)
                
                # Sort by level, group_name, sort_order
                items_data.sort(key=lambda x: (x['level'], x['group_name'] or '', x['sort_order']))
                
                return self._build_tree_structure(items_data)
                
        except Exception as e:
            logging.error(f"Error fetching nav items for user_id={user_id}: {e}")
            return []
    

    def get_items_by_level(self, level: int, language: str = 'en') -> List[Dict]:
        """Get all items at a specific hierarchy level with language support"""
        try:
            with get_session() as session:
                # Get all items at the specified level
                statement = select(ItNavMenu).where(
                    and_(ItNavMenu.level == level, ItNavMenu.is_active == True)
                ).order_by(ItNavMenu.group_name, ItNavMenu.sort_order)
                
                items = session.exec(statement).all()
                
                # Convert to dict format with localized titles
                items_data = []
                for item in items:
                    item_dict = {
                        'id': item.id,
                        'url': item.url,
                        'parent_id': item.parent_id,
                        'level': item.level,
                        'path': item.path,
                        'group_name': item.group_name,
                        'sort_order': item.sort_order,
                        'it_report_structures_id': item.it_report_structures_id,
                        'has_children': item.has_children,
                        'is_active': item.is_active,
                        'created_at': item.created_at,
                        'updated_at': item.updated_at,
                        'original_title': item.title,
                        'title_si': item.title_si,
                        'title_ta': item.title_ta,
                        'title_tl': item.title_tl,
                        'title_th': item.title_th
                    }
                    
                    # Get localized title
                    item_dict['title'] = self.get_localized_title(item_dict, language)
                    items_data.append(item_dict)
                
                return items_data
                
        except Exception as e:
            logging.error(f"Error fetching items by level {level}: {e}")
            return []
    

    def get_subtree(self, item_id: int, user_id: Optional[int] = None, language: str = 'en') -> List[Dict]:
        """Get entire subtree under a specific item using path"""
        try:
            with get_session() as session:
                # Get parent item's path
                parent_stmt = select(ItNavMenu.path).where(ItNavMenu.id == item_id)
                parent_result = session.exec(parent_stmt).first()
                
                if not parent_result:
                    return []
                
                parent_path = parent_result
                
                if user_id:
                    # Query with user rights join
                    stmt = select(
                        ItNavMenu.id,
                        ItNavMenu.title,
                        ItNavMenu.title_si,
                        ItNavMenu.title_ta,
                        ItNavMenu.title_tl,
                        ItNavMenu.title_th,
                        ItNavMenu.url,
                        ItNavMenu.parent_id,
                        ItNavMenu.level,
                        ItNavMenu.path,
                        ItNavMenu.group_name,
                        ItNavMenu.sort_order,
                        ItNavMenu.is_active,
                        ItNavMenu.it_report_structures_id,
                        ItNavMenu.created_at,
                        ItNavMenu.updated_at,
                        ItNavMenu.has_children,
                        ItUserNavRights.nav_menu_id.label('user_has_direct_access')
                    ).select_from(
                        ItNavMenu.__table__.outerjoin(
                            ItUserNavRights.__table__,
                            and_(
                                ItNavMenu.id == ItUserNavRights.nav_menu_id,
                                ItUserNavRights.user_id == user_id,
                                ItUserNavRights.can_view == True
                            )
                        )
                    ).where(
                        and_(
                            ItNavMenu.path.like(f"{parent_path}%"),
                            ItNavMenu.is_active == True
                        )
                    ).order_by(ItNavMenu.level, ItNavMenu.sort_order)
                    
                    results = session.exec(stmt).all()
                    
                    # Convert to dict format
                    items_data = []
                    for row in results:
                        item_dict = {
                            'id': row.id,
                            'title': row.title,
                            'title_si': row.title_si,
                            'title_ta': row.title_ta,
                            'title_tl': row.title_tl,
                            'title_th': row.title_th,
                            'url': row.url,
                            'parent_id': row.parent_id,
                            'level': row.level,
                            'path': row.path,
                            'group_name': row.group_name,
                            'sort_order': row.sort_order,
                            'is_active': row.is_active,
                            'it_report_structures_id': row.it_report_structures_id,
                            'created_at': row.created_at,
                            'updated_at': row.updated_at,
                            'has_children': row.has_children,
                            'original_title': row.title,
                            'user_has_access': row.user_has_direct_access is not None
                        }
                        
                        # Get localized title
                        item_dict['title'] = self.get_localized_title(item_dict, language)
                        items_data.append(item_dict)
                else:
                    # Query without user rights
                    stmt = select(ItNavMenu).where(
                        and_(
                            ItNavMenu.path.like(f"{parent_path}%"),
                            ItNavMenu.is_active == True
                        )
                    ).order_by(ItNavMenu.level, ItNavMenu.sort_order)
                    
                    results = session.exec(stmt).all()
                    
                    # Convert to dict format
                    items_data = []
                    for item in results:
                        item_dict = {
                            'id': item.id,
                            'title': item.title,
                            'title_si': item.title_si,
                            'title_ta': item.title_ta,
                            'title_tl': item.title_tl,
                            'title_th': item.title_th,
                            'url': item.url,
                            'parent_id': item.parent_id,
                            'level': item.level,
                            'path': item.path,
                            'group_name': item.group_name,
                            'sort_order': item.sort_order,
                            'is_active': item.is_active,
                            'it_report_structures_id': item.it_report_structures_id,
                            'created_at': item.created_at,
                            'updated_at': item.updated_at,
                            'has_children': item.has_children,
                            'original_title': item.title
                        }
                        
                        # Get localized title
                        item_dict['title'] = self.get_localized_title(item_dict, language)
                        items_data.append(item_dict)
                
                return self._build_tree_structure(items_data)
                
        except Exception as e:
            logging.error(f"Error fetching subtree for item {item_id}: {e}")
            return []
    

    def _build_tree_structure(self, items_data: List[Dict]) -> List[Dict]:
        """Build tree structure from flat list"""
        if not items_data:
            return []
        
        # Remove duplicates based on ID and create lookup dictionary
        seen_ids = set()
        unique_items = []
        for item in items_data:
            if item['id'] not in seen_ids:
                unique_items.append(item)
                seen_ids.add(item['id'])
        
        # Create lookup dictionary and prepare items
        lookup = {item['id']: item for item in unique_items}
        
        # Add children array for tree structure
        for item in unique_items:
            item['children'] = []
            # user_has_access defaults to True for admin views if not specified
            if 'user_has_access' not in item:
                item['user_has_access'] = True
        
        # Build tree structure
        root_items = []
        for item in unique_items:
            if item['parent_id'] and item['parent_id'] in lookup:
                lookup[item['parent_id']]['children'].append(item)
            else:
                root_items.append(item)
        
        # Sort by sort_order
        def sort_items(items):
            items.sort(key=lambda x: x['sort_order'])
            for item in items:
                if item['children']:
                    sort_items(item['children'])
        
        sort_items(root_items)
        return root_items

    def get_all_menu_items(self, language: str = 'en') -> List[Dict]:
        """Get all menu items at all levels with language support for user rights management"""
        try:
            all_items = []
            for level in range(0, 5):  # Support up to 5 levels
                level_items = self.get_items_by_level(level, language)
                all_items.extend(level_items)  # Don't break on empty levels
            return all_items
        except Exception as e:
            logger.error(f"Error fetching all menu items: {e}")
            return []

    def create_menu_item(self, item_data: Dict, user_id: Optional[int] = None) -> Dict:
        """Create a new navigation menu item with optional report structure and auto-assign rights to creator"""
        try:
            with get_session() as session:
                # Validate required fields
                required_fields = ['title', 'url']
                for field in required_fields:
                    if field not in item_data or not item_data[field]:
                        raise ValueError(f"Required field '{field}' is missing or empty")

                # Handle report structure creation or update
                report_structure_id = item_data.get('it_report_structures_id')

                base_query = item_data.get('base_query')
                report_name = item_data.get('report_name', '')

                if base_query and str(base_query).strip() != '':
                    jrxml_json = self.report_service.generate_jrxml_json_from_query(base_query)
                    jrxml_json['report_name'] = report_name
                    item_data['jrxml_json'] = json.dumps(jrxml_json)
                elif report_name and str(report_name).strip() != '':
                    # Create minimal JRXML structure with just report_name
                    jrxml_json = {
                        "base_query": "",
                        "headings": {
                            "main_heading": "",
                            "sub_heading": ""
                        },
                        "parameters": [],
                        "report_name": report_name,
                        "search_fields": [],
                        "select_fields": [],
                        "sort_fields": []
                    }
                    item_data['jrxml_json'] = json.dumps(jrxml_json)
                else:
                    item_data['jrxml_json'] = None

                # Create report structure if base_query, jrxml_json, or report_name are present
                base_query_val = item_data.get('base_query')
                jrxml_json_val = item_data.get('jrxml_json')
                has_report_data = (
                    (base_query_val is not None and str(base_query_val).strip() != '') or
                    (jrxml_json_val is not None and str(jrxml_json_val).strip() != '') or
                    (report_name and str(report_name).strip() != '')
                )

                if has_report_data and not report_structure_id:
                    # Create new report structure
                    report_structure_id = self._create_report_structure(session, item_data)
                    item_data['it_report_structures_id'] = report_structure_id
                elif has_report_data and report_structure_id:
                    # Update existing report structure
                    self._update_report_structure(session, report_structure_id, item_data)

                # --- Hierarchy logic: resolve parent_id if not provided ---
                parent_id = item_data.get('parent_id')
                group_name = item_data.get('group_name')
                if parent_id is None and group_name:
                    resolved_parent = self._resolve_parent_id_from_group(session, group_name)
                    parent_id = resolved_parent if resolved_parent is not None else None

                level = 0
                path = f"/{0}/"  # Temporary path, will be updated after getting ID
                parent_path = "/"

                if parent_id:
                    # Get parent item to calculate level and path
                    parent_stmt = select(ItNavMenu.level, ItNavMenu.path).where(ItNavMenu.id == parent_id)
                    parent_result = session.exec(parent_stmt).first()
                    if not parent_result:
                        raise ValueError(f"Parent item with ID {parent_id} not found")
                    level = parent_result[0] + 1  # level
                    parent_path = parent_result[1]  # path

                # Create new menu item
                new_menu_item = ItNavMenu(
                    title=item_data['title'],
                    title_si=item_data.get('title_si'),
                    title_ta=item_data.get('title_ta'),
                    title_tl=item_data.get('title_tl'),
                    title_th=item_data.get('title_th'),
                    url=item_data['url'],
                    parent_id=parent_id,
                    level=level,
                    path=path,  # Will be updated after getting ID
                    group_name=group_name,
                    sort_order=item_data.get('sort_order', 0),
                    is_active=item_data.get('is_active', True),
                    it_report_structures_id=report_structure_id,
                    has_children=False,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )

                session.add(new_menu_item)
                session.flush()  # Get the ID without committing yet
                new_id = new_menu_item.id

                # Generate correct path and level with the new ID
                correct_path = NavPathHelper.generate_path(parent_path, new_id)
                correct_level = NavPathHelper.calculate_level(correct_path)
                
                # Update the item with correct path and level
                new_menu_item.path = correct_path
                new_menu_item.level = correct_level

                # Update parent's has_children flag if applicable
                if parent_id:
                    parent_item = session.get(ItNavMenu, parent_id)
                    if parent_item:
                        parent_item.has_children = True
                        session.add(parent_item)

                # Automatically grant navigation rights to the creator
                if user_id:
                    try:
                        # Check if user rights already exist
                        existing_rights_stmt = select(ItUserNavRights).where(
                            and_(
                                ItUserNavRights.user_id == user_id,
                                ItUserNavRights.nav_menu_id == new_id
                            )
                        )
                        existing_rights = session.exec(existing_rights_stmt).first()
                        
                        if existing_rights:
                            existing_rights.can_view = True
                            existing_rights.updated_at = datetime.utcnow()
                        else:
                            new_rights = ItUserNavRights(
                                user_id=user_id,
                                nav_menu_id=new_id,
                                can_view=True,
                                created_at=datetime.utcnow(),
                                updated_at=datetime.utcnow()
                            )
                            session.add(new_rights)
                        
                        logging.info(f"Granted navigation rights to user {user_id} for menu item {new_id}")
                    except Exception as rights_error:
                        logging.warning(f"Failed to grant rights to creator: {rights_error}")
                        # Don't fail the entire operation if rights assignment fails
                
                session.commit()
                
                # Return the created item with report structure info if available
                if report_structure_id:
                    result = self.get_menu_item_with_report_structure(new_id)
                else:
                    # Convert the created item to dict
                    result = {
                        'id': new_menu_item.id,
                        'title': new_menu_item.title,
                        'title_si': new_menu_item.title_si,
                        'title_ta': new_menu_item.title_ta,
                        'title_tl': new_menu_item.title_tl,
                        'title_th': new_menu_item.title_th,
                        'url': new_menu_item.url,
                        'parent_id': new_menu_item.parent_id,
                        'level': new_menu_item.level,
                        'path': new_menu_item.path,
                        'group_name': new_menu_item.group_name,
                        'sort_order': new_menu_item.sort_order,
                        'is_active': new_menu_item.is_active,
                        'it_report_structures_id': new_menu_item.it_report_structures_id,
                        'has_children': new_menu_item.has_children,
                        'created_at': new_menu_item.created_at,
                        'updated_at': new_menu_item.updated_at
                    }
                
                logging.info(f"Created navigation item with ID: {new_id}")
                return result
                
        except Exception as e:
            logging.error(f"Error creating navigation item: {e}")
            raise
    

    def _create_report_structure(self, session, item_data: Dict) -> int:
        """Create a new report structure and return its ID"""
        
        # Extract data for report structure
        jrxml_json = item_data.get('jrxml_json', '{}')
        base_query = item_data.get('base_query', None)
        
        # Create new report structure instance
        new_report = ItReportStructure(
            jrxml_json=jrxml_json,
            base_query=base_query,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        session.add(new_report)
        session.flush()  # Flush to get the ID without committing
        return new_report.id

    def _update_report_structure(self, session, report_id: int, item_data: Dict):
        """Update the report structure fields with provided data"""
        
        # Get the existing report structure
        report = session.get(ItReportStructure, report_id)
        if not report:
            return
        
        # Update fields if they are provided
        update_needed = False
        
        if 'jrxml_json' in item_data:
            report.jrxml_json = item_data['jrxml_json']
            update_needed = True
            
        if 'base_query' in item_data:
            report.base_query = item_data['base_query']
            update_needed = True
        
        if update_needed:
            report.updated_at = datetime.utcnow()
            session.add(report)

    def get_menu_item_with_report_structure(self, item_id: int) -> Dict:
        """Get menu item with its associated report structure data"""
        try:
            with get_session() as session:
                # Query with LEFT JOIN to get full report structure data
                statement = select(ItNavMenu, ItReportStructure).select_from(
                    ItNavMenu.__table__.outerjoin(ItReportStructure.__table__)
                ).where(ItNavMenu.id == item_id)
                
                result = session.exec(statement).first()
                
                if result:
                    nav_menu, report_structure = result
                    menu_dict = {
                        'id': nav_menu.id,
                        'title': nav_menu.title,
                        'title_si': nav_menu.title_si,
                        'title_ta': nav_menu.title_ta, 
                        'title_tl': nav_menu.title_tl,
                        'title_th': nav_menu.title_th,
                        'url': nav_menu.url,
                        'parent_id': nav_menu.parent_id,
                        'level': nav_menu.level,
                        'path': nav_menu.path,
                        'group_name': nav_menu.group_name,
                        'sort_order': nav_menu.sort_order,
                        'it_report_structures_id': nav_menu.it_report_structures_id,
                        'has_children': nav_menu.has_children,
                        'is_active': nav_menu.is_active,
                        'created_at': nav_menu.created_at,
                        'updated_at': nav_menu.updated_at
                    }
                    
                    # Add report structure data if available
                    if report_structure:
                        menu_dict.update({
                            'report_description': getattr(report_structure, 'description', None),
                            'base_query': report_structure.base_query,
                            'json_form': getattr(report_structure, 'json_form', None),
                            'json_schema': getattr(report_structure, 'json_schema', None),
                            'placeholder_data': getattr(report_structure, 'placeholder_data', None),
                            'jrxml_json': report_structure.jrxml_json
                        })
                    
                    return menu_dict
                
                return {}
                
        except Exception as e:
            logging.error(f"Error getting menu item with report structure: {e}")
            return {}

    def _resolve_parent_id_from_group(self, session, group_name: str) -> Optional[int]:
        """Resolve parent_id from group_name by finding matching group or menu item"""
        if not group_name:
            return None
        
        # First, try to find an existing group with the same name
        group_statement = select(ItNavMenu.id, ItNavMenu.parent_id, ItNavMenu.level).where(
            and_(ItNavMenu.group_name == group_name, ItNavMenu.is_active == True)
        ).order_by(ItNavMenu.level).limit(1)
        
        group_result = session.exec(group_statement).first()
        if group_result:
            return group_result.parent_id
        
        # If no group found, try to find a menu item with matching title that could be a parent
        menu_statement = select(ItNavMenu.id).where(
            and_(
                ItNavMenu.title == group_name,
                ItNavMenu.is_active == True,
                ItNavMenu.level <= 1
            )
        ).order_by(ItNavMenu.level).limit(1)
        
        menu_result = session.exec(menu_statement).first()
        if menu_result:
            return menu_result  
        
        return None

    def update_menu_item(self, item_id: int, item_data: Dict) -> Dict:
        """Update an existing navigation menu item with comprehensive field support and automatic hierarchy updates"""
        try:
            with get_session() as session:
                # Check if item exists
                existing_item = session.get(ItNavMenu, item_id)
                if not existing_item:
                    raise ValueError(f"Menu item with ID {item_id} not found")
                
                # Store original values before any changes
                original_parent_id = existing_item.parent_id
                
                # Handle report structure updates - check for base_query changes and report_name updates
                if 'base_query' in item_data or 'report_name' in item_data:
                    # Get current base_query and jrxml_json from existing report structure
                    current_base_query = None
                    current_jrxml_json = None
                    if existing_item.it_report_structures_id:
                        existing_report = session.get(ItReportStructure, existing_item.it_report_structures_id)
                        if existing_report:
                            current_base_query = existing_report.base_query
                            try:
                                current_jrxml_json = json.loads(existing_report.jrxml_json) if existing_report.jrxml_json else {}
                            except json.JSONDecodeError:
                                current_jrxml_json = {}
                    
                    base_query_changed = 'base_query' in item_data and item_data['base_query'] != current_base_query
                    report_name_changed = ('report_name' in item_data and 
                                         current_jrxml_json and 
                                         current_jrxml_json.get('report_name') != item_data.get('report_name', ''))
                    
                    if base_query_changed:
                        # Base query changed - regenerate entire JRXML
                        logging.info(f"Base query changed for menu item {item_id}, regenerating JRXML")
                        jrxml_json = self.report_service.generate_jrxml_json_from_query(item_data['base_query'])
                        jrxml_json['report_name'] = item_data.get('report_name', '')
                        item_data['jrxml_json'] = json.dumps(jrxml_json)
                        
                        if existing_item.it_report_structures_id:
                            # Update existing report structure
                            self._update_report_structure(session, existing_item.it_report_structures_id, item_data)
                        else:
                            # Create new report structure if data provided but none exists
                            report_structure_id = self._create_report_structure(session, item_data)
                            item_data['it_report_structures_id'] = report_structure_id
                            
                    elif report_name_changed and current_jrxml_json:
                        # Only report_name changed - update just the report_name in existing JRXML
                        logging.info(f"Report name changed for menu item {item_id}, updating JRXML report_name")
                        current_jrxml_json['report_name'] = item_data.get('report_name', '')
                        item_data['jrxml_json'] = json.dumps(current_jrxml_json)
                        
                        if existing_item.it_report_structures_id:
                            # Update existing report structure
                            self._update_report_structure(session, existing_item.it_report_structures_id, item_data)
                    else:
                        # No significant changes, skip JRXML updates for performance
                        logging.debug(f"No significant report structure changes for menu item {item_id}")
                        if not base_query_changed:
                            item_data.pop('base_query', None)
                        item_data.pop('jrxml_json', None)
                
                # Handle group_name updates and automatic parent_id resolution
                group_name_changed = False
                new_parent_id = existing_item.parent_id
                
                if 'group_name' in item_data:
                    old_group_name = existing_item.group_name
                    new_group_name = item_data['group_name']
                    
                    if old_group_name != new_group_name:
                        group_name_changed = True
                        # Resolve new parent_id from group_name
                        new_parent_id = self._resolve_parent_id_from_group(session, new_group_name)
                        item_data['parent_id'] = new_parent_id
                
                # Calculate new hierarchy if parent changed
                level_changed = False
                new_level = existing_item.level
                new_path = existing_item.path
                
                if group_name_changed or ('parent_id' in item_data and item_data['parent_id'] != existing_item.parent_id):
                    level_changed = True
                    
                    if new_parent_id:
                        # Get parent details for level and path calculation
                        parent_item = session.get(ItNavMenu, new_parent_id)
                        if parent_item:
                            new_level = parent_item.level + 1
                            new_path = NavPathHelper.generate_path(parent_item.path, item_id)
                        else:
                            raise ValueError(f"Parent item with ID {new_parent_id} not found")
                    else:
                        # Root level item
                        new_level = 0
                        new_path = f"/{item_id}/"
                    
                    # Add calculated fields to update data
                    item_data['level'] = new_level
                    item_data['path'] = new_path
                
                # Update menu item fields
                updatable_fields = ['title', 'title_si', 'title_ta', 'title_tl', 'title_th', 'url', 'group_name', 'parent_id', 'level', 'path', 
                                  'sort_order', 'is_active', 'it_report_structures_id']
                
                update_needed = False
                for field in updatable_fields:
                    if field in item_data:
                        setattr(existing_item, field, item_data[field])
                        update_needed = True
                
                # Update timestamp if any field was updated
                if update_needed:
                    existing_item.updated_at = datetime.utcnow()
                    session.add(existing_item)
                
                # Update has_children flags if parent changed
                if level_changed:
                    # Update old parent's has_children flag
                    if original_parent_id and original_parent_id != new_parent_id:
                        child_count_stmt = select(func.count(ItNavMenu.id)).where(
                            and_(ItNavMenu.parent_id == original_parent_id, ItNavMenu.id != item_id)
                        )
                        child_count = session.exec(child_count_stmt).first()
                        
                        old_parent = session.get(ItNavMenu, original_parent_id)
                        if old_parent:
                            old_parent.has_children = child_count > 0
                            session.add(old_parent)
                    
                    # Update new parent's has_children flag
                    if new_parent_id and new_parent_id != original_parent_id:
                        new_parent = session.get(ItNavMenu, new_parent_id)
                        if new_parent:
                            new_parent.has_children = True
                            session.add(new_parent)
                
                # If this item has children and its level/path changed, update all descendants
                if level_changed and existing_item.has_children:
                    self._update_descendant_hierarchy(session, item_id, new_level, new_path)
                
                session.commit()
                
                # Return updated item with report structure data
                return self.get_menu_item_by_id(item_id) or {}
                
        except Exception as e:
            logging.error(f"Error updating navigation item {item_id}: {e}")
            raise
    

    def delete_menu_item(self, item_id: int) -> bool:
        """Delete a navigation menu item and its children"""
        try:
            with get_session() as session:
                # Check if item exists
                existing_item = session.get(ItNavMenu, item_id)
                if not existing_item:
                    raise ValueError(f"Menu item with ID {item_id} not found")
                
                # Get all children using path
                item_path = existing_item.path
                items_to_delete_stmt = select(ItNavMenu.id).where(
                    ItNavMenu.path.like(f"{item_path}%")
                )
                items_to_delete_results = session.exec(items_to_delete_stmt).all()
                ids_to_delete = list(items_to_delete_results)
                
                # Delete from it_user_nav_rights first (foreign key constraint)
                for item_id_to_delete in ids_to_delete:
                    delete_rights_stmt = delete(ItUserNavRights).where(
                        ItUserNavRights.nav_menu_id == item_id_to_delete
                    )
                    session.exec(delete_rights_stmt)
                
                # Delete navigation items
                for item_id_to_delete in ids_to_delete:
                    delete_nav_stmt = delete(ItNavMenu).where(ItNavMenu.id == item_id_to_delete)
                    session.exec(delete_nav_stmt)
                
                # Update parent's has_children flag if necessary
                parent_id = existing_item.parent_id
                if parent_id:
                    remaining_children_stmt = select(func.count(ItNavMenu.id)).where(
                        ItNavMenu.parent_id == parent_id
                    )
                    remaining_children_count = session.exec(remaining_children_stmt).first()
                    
                    if remaining_children_count == 0:
                        parent_item = session.get(ItNavMenu, parent_id)
                        if parent_item:
                            parent_item.has_children = False
                            session.add(parent_item)
                
                session.commit()
                
                logging.info(f"Deleted navigation item {item_id} and {len(ids_to_delete)} total items")
                return True
                
        except Exception as e:
            logging.error(f"Error deleting navigation item {item_id}: {e}")
            raise
    

    def get_menu_item_by_id(self, item_id: int) -> Optional[Dict]:
        """Get a specific menu item by ID with report structure data"""
        try:
            with get_session() as session:
                # Query with LEFT JOIN to get report structure data
                statement = select(ItNavMenu, ItReportStructure).select_from(
                    ItNavMenu.__table__.outerjoin(ItReportStructure.__table__)
                ).where(ItNavMenu.id == item_id)
                
                result = session.exec(statement).first()
                
                if result:
                    nav_menu, report_structure = result
                    return {
                        'id': nav_menu.id,
                        'title': nav_menu.title,
                        'title_si': nav_menu.title_si,
                        'title_ta': nav_menu.title_ta,
                        'title_tl': nav_menu.title_tl,
                        'title_th': nav_menu.title_th,
                        'url': nav_menu.url,
                        'parent_id': nav_menu.parent_id,
                        'level': nav_menu.level,
                        'path': nav_menu.path,
                        'group_name': nav_menu.group_name,
                        'sort_order': nav_menu.sort_order,
                        'is_active': nav_menu.is_active,
                        'it_report_structures_id': nav_menu.it_report_structures_id,
                        'created_at': nav_menu.created_at,
                        'updated_at': nav_menu.updated_at,
                        'has_children': nav_menu.has_children,
                        'base_query': report_structure.base_query if report_structure else None,
                        'jrxml_json': report_structure.jrxml_json if report_structure else None
                    }
                return None
                
        except Exception as e:
            logging.error(f"Error fetching menu item {item_id}: {e}")
            return None
    

    def validate_menu_item_data(self, item_data: Dict, item_id: Optional[int] = None) -> List[str]:
        """Validate menu item data and return list of validation errors"""
        errors = []
        
        # Required field validation
        if 'title' in item_data and not item_data['title']:
            errors.append("Title cannot be empty")
        
        # Validate multi-language titles (optional but not empty if provided)
        language_fields = ['title_si', 'title_ta', 'title_tl', 'title_th']
        for field in language_fields:
            if field in item_data and item_data[field] is not None and item_data[field].strip() == '':
                errors.append(f"{field.replace('title_', '').upper()} title cannot be empty if provided")
        
        if 'url' in item_data and not item_data['url']:
            errors.append("URL cannot be empty")
        
        # URL format validation
        if 'url' in item_data and item_data['url']:
            url = item_data['url']
            if not url.startswith('/'):
                errors.append("URL must start with '/'")
        
        # Check for duplicate URLs (excluding current item if updating)
        if 'url' in item_data:
            try:
                with get_session() as session:
                    if item_id:
                        stmt = select(ItNavMenu.id).where(
                            and_(ItNavMenu.url == item_data['url'], ItNavMenu.id != item_id)
                        )
                    else:
                        stmt = select(ItNavMenu.id).where(ItNavMenu.url == item_data['url'])
                    
                    result = session.exec(stmt).first()
                    if result:
                        errors.append("URL already exists")
                        
            except Exception as e:
                errors.append(f"Error validating URL: {str(e)}")
        
        # Check for duplicate titles within the same parent/level (excluding current item if updating)
        if 'title' in item_data:
            try:
                with get_session() as session:
                    parent_id = item_data.get('parent_id')
                    title = item_data['title']
                    
                    if item_id:
                        # For updates, exclude the current item
                        if parent_id:
                            stmt = select(ItNavMenu.id).where(
                                and_(
                                    ItNavMenu.title == title,
                                    ItNavMenu.parent_id == parent_id,
                                    ItNavMenu.id != item_id
                                )
                            )
                        else:
                            stmt = select(ItNavMenu.id).where(
                                and_(
                                    ItNavMenu.title == title,
                                    ItNavMenu.parent_id.is_(None),
                                    ItNavMenu.id != item_id
                                )
                            )
                    else:
                        # For new items
                        if parent_id:
                            stmt = select(ItNavMenu.id).where(
                                and_(ItNavMenu.title == title, ItNavMenu.parent_id == parent_id)
                            )
                        else:
                            stmt = select(ItNavMenu.id).where(
                                and_(ItNavMenu.title == title, ItNavMenu.parent_id.is_(None))
                            )
                    
                    result = session.exec(stmt).first()
                    if result:
                        if parent_id:
                            errors.append(f"A menu item with title '{title}' already exists under the same parent")
                        else:
                            errors.append(f"A top-level menu item with title '{title}' already exists")
                            
            except Exception as e:
                errors.append(f"Error validating title: {str(e)}")
        
        # Parent validation
        if 'parent_id' in item_data and item_data['parent_id']:
            try:
                with get_session() as session:
                    stmt = select(ItNavMenu).where(ItNavMenu.id == item_data['parent_id'])
                    parent = session.exec(stmt).first()
                    
                    if parent is None:
                        errors.append("Parent item does not exist")
                    elif parent.level >= 2:  # Max 3 levels (0, 1, 2)
                        errors.append("Cannot create items beyond level 2")
                        
            except Exception as e:
                errors.append(f"Error validating parent: {str(e)}")
        
        # Report structure validation
        if 'it_report_structures_id' in item_data and item_data['it_report_structures_id']:
            try:
                with get_session() as session:
                    stmt = select(ItReportStructure.id).where(
                        and_(
                            ItReportStructure.id == item_data['it_report_structures_id'],
                            ItReportStructure.is_active == True
                        )
                    )
                    result = session.exec(stmt).first()
                    
                    if not result:
                        errors.append("Report structure ID does not exist or is inactive")
                        
            except Exception as e:
                errors.append(f"Error validating report structure: {str(e)}")
        
        # JRXML JSON validation
        if 'jrxml_json' in item_data and item_data['jrxml_json']:
            try:
                import json
                # Validate that jrxml_json is valid JSON
                json.loads(item_data['jrxml_json'])
            except json.JSONDecodeError as e:
                errors.append(f"Invalid JSON format in jrxml_json: {str(e)}")
            except Exception as e:
                errors.append(f"Error validating jrxml_json: {str(e)}")
        
        # Base query validation
        if 'base_query' in item_data and item_data['base_query']:
            base_query = item_data['base_query'].strip()
            if base_query:
                try:
                    JRXMLJsonGenerator().validate_base_query(base_query)
                except BaseQueryValidationError as ve:
                    errors.append(str(ve))
        
        return errors

    def _update_descendant_hierarchy(self, session, parent_id: int, parent_level: int, parent_path: str):
        """Recursively update level and path for all descendants when parent hierarchy changes"""
        # Get all direct children
        children_stmt = select(ItNavMenu).where(
            and_(ItNavMenu.parent_id == parent_id, ItNavMenu.is_active == True)
        )
        children = session.exec(children_stmt).all()
        
        for child in children:
            # Calculate new level and path for child
            new_child_level = parent_level + 1
            new_child_path = NavPathHelper.generate_path(parent_path, child.id)
            
            # Update child
            child.level = new_child_level
            child.path = new_child_path
            child.updated_at = datetime.utcnow()
            session.add(child)
            
            # Recursively update grandchildren if any
            if child.has_children:
                self._update_descendant_hierarchy(session, child.id, new_child_level, new_child_path)

    def get_all_existing_urls(self) -> List[Dict[str, str]]:
        """Get distinct URLs of level 0 and 1 menu items only for dropdown selection"""
        try:
            with get_session() as session:
                # Get items at level 0 and 1 only
                statement = select(ItNavMenu.url, ItNavMenu.title, ItNavMenu.level, ItNavMenu.group_name).where(
                    and_(
                        ItNavMenu.is_active == True,
                        or_(ItNavMenu.level == 0, ItNavMenu.level == 1)
                    )
                ).distinct().order_by(ItNavMenu.level, ItNavMenu.group_name, ItNavMenu.title)
                
                results = session.exec(statement).all()
                
                urls = []
                for row in results:
                    urls.append({
                        'url': row[0],  # url
                        'title': row[1],  # title
                        'level': row[2],  # level
                        'group_name': row[3] or 'No Group'  # group_name
                    })
                return urls
        except Exception as e:
            logging.error(f"Error fetching existing URLs: {e}")
            return []

    def get_existing_group_names(self) -> List[Dict[str, any]]:
        """Get all existing group names and level 0/1 menu items for dropdown selection"""
        try:
            with get_session() as session:
                # Get existing group names from all levels with count
                group_statement = select(
                    ItNavMenu.group_name,
                    ItNavMenu.parent_id,
                    ItNavMenu.level,
                    func.count().label('item_count')
                ).where(
                    and_(ItNavMenu.is_active == True, ItNavMenu.group_name.is_not(None))
                ).group_by(
                    ItNavMenu.group_name, ItNavMenu.parent_id, ItNavMenu.level
                ).order_by(ItNavMenu.level, ItNavMenu.group_name)
                
                group_results = session.exec(group_statement).all()
                
                # Get individual menu items from level 0 and 1 that could serve as parent groups
                menu_statement = select(
                    ItNavMenu.id,
                    ItNavMenu.title,
                    ItNavMenu.parent_id,
                    ItNavMenu.level,
                    ItNavMenu.group_name
                ).where(
                    and_(
                        ItNavMenu.is_active == True,
                        or_(ItNavMenu.level == 0, ItNavMenu.level == 1)
                    )
                ).order_by(ItNavMenu.level, ItNavMenu.title)
                
                menu_results = session.exec(menu_statement).all()
                
                groups = []
                
                # Add existing group names
                for row in group_results:
                    groups.append({
                        'group_name': row[0],  # group_name
                        'parent_id': row[1],   # parent_id
                        'level': row[2],       # level
                        'item_count': row[3]   # item_count
                    })
                
                # Add level 0 and 1 menu items as potential parent groups
                for row in menu_results:
                    groups.append({
                        'group_name': row[1],  # title as group_name
                        'parent_id': row[0],   # id as parent_id
                        'level': row[3] + 1,   # level + 1
                        'item_count': 1,
                        'original_group': row[4]  # original group_name
                    })
                
                # Remove duplicates and sort
                seen = set()
                unique_groups = []
                for group in groups:
                    # Create a unique identifier for deduplication
                    key = (group['group_name'], group['parent_id'])
                    if key not in seen:
                        seen.add(key)
                        unique_groups.append(group)
                
                # Sort by level, then by group name
                unique_groups.sort(key=lambda x: (x['level'], x['group_name']))
                
                return unique_groups
                
        except Exception as e:
            logging.error(f"Error fetching existing group names: {e}")
            return []


# Backward compatibility functions
def get_nav_items_for_user(user_id: int):
    """Backward compatibility function"""
    nav_service = NavService()
    return nav_service.get_user_navigation(user_id)

def get_all_nav_items():
    """Backward compatibility function"""
    nav_service = NavService()
    return nav_service.get_all_menu_items()