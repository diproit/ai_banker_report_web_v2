import re
from typing import Dict, List, Any
from config.database import get_session
from sqlmodel import select
from models.it_institute import ItInstitute

import logging
logger = logging.getLogger(__name__)


def strip_sql_comments(query: str) -> str:
    """
    Utility function to strip SQL comments from a query
    
    Args:
        query (str): SQL query to strip comments from
        
    Returns:
        str: Query with comments removed
    """
    # Remove single-line comments (-- comment)
    # This pattern removes everything from -- to the end of the line
    query = re.sub(r'--.*?$', '', query, flags=re.MULTILINE)
    
    # Remove multi-line comments (/* comment */)
    # This pattern removes everything between /* and */
    query = re.sub(r'/\*.*?\*/', '', query, flags=re.DOTALL)
    
    # Clean up extra whitespace and empty lines
    query = re.sub(r'\n\s*\n', '\n', query)  # Remove empty lines
    query = query.strip()
    
    return query

class DuplicateFieldError(Exception):
    """Exception raised when duplicate field names are detected in SELECT clause"""
    pass

class MissingAliasError(Exception):
    """Exception raised when a SELECT field is missing a required alias"""
    pass

class BaseQueryValidationError(Exception):
    """Raised when a base_query fails SQL validation (DML on non-temp tables, temp table naming, etc.)"""
    pass


class SQLQueryParser:
    """Parser for SQL SELECT queries to extract various components"""
    
    def __init__(self):
        # Pattern to match SQL parameters like $P{param_name}
        self.parameter_pattern = r'\$P\{([^}]+)\}'
        
    def parse_query(self, query: str) -> Dict[str, Any]:
        """
        Parse a SQL query and extract its components
        
        Args:
            query: SQL SELECT query string
            
        Returns:
            Dictionary containing parsed components
        """
        # Store the query for parameter context analysis
        self.last_query = query
        
        # Clean and normalize the query
        cleaned_query = self._clean_query(query)
        
        # Extract different parts of the query
        select_fields = self._extract_select_fields(cleaned_query)
        where_conditions = self._extract_where_conditions(cleaned_query)
        order_by_fields = self._extract_order_by_fields(cleaned_query)
        parameters = self._extract_parameters(cleaned_query)
        
        return {
            'select_fields': select_fields,
            'where_conditions': where_conditions,
            'order_by_fields': order_by_fields,
            'parameters': parameters,
            'original_query': query
        }
    
    def _clean_query(self, query: str) -> str:
        """Clean and normalize the SQL query"""
        # First strip all SQL comments using the centralized utility
        cleaned = strip_sql_comments(query)
        # Remove extra whitespace and newlines
        cleaned = re.sub(r'\s+', ' ', cleaned.strip())
        # Remove trailing semicolons
        cleaned = re.sub(r';+\s*$', '', cleaned)
        return cleaned
    
    def _extract_select_fields(self, query: str) -> List[Dict[str, str]]:
        """Extract SELECT fields from the query with alias information"""
        # Locate the top-level SELECT ... FROM region by scanning and tracking parentheses.
        q = query
        sel_match = re.search(r'\bSELECT\b', q, re.IGNORECASE)
        if not sel_match:
            return []

        start = sel_match.end()
        # Scan forward to find a top-level FROM (i.e., a FROM not enclosed in parentheses)
        paren_count = 0
        i = start
        from_pos = -1
        qlen = len(q)
        while i < qlen:
            ch = q[i]
            if ch == '(':
                paren_count += 1
                i += 1
                continue
            if ch == ')':
                paren_count = max(0, paren_count - 1)
                i += 1
                continue

            # look for the word FROM when not inside parentheses
            if paren_count == 0:
                # check substring at i for FROM (word boundary)
                if re.match(r'\s*FROM\b', q[i:], re.IGNORECASE):
                    # compute the position where FROM starts
                    m = re.match(r'\s*FROM\b', q[i:], re.IGNORECASE)
                    from_pos = i + m.start() + (0 if q[i].isspace() else 0)
                    break
            i += 1

        if from_pos == -1:
            return []

        select_clause = q[start:from_pos]
        
        # Split by comma, but be careful about nested functions and aliases
        fields = []
        current_field = ""
        paren_count = 0
        
        for char in select_clause:
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
            elif char == ',' and paren_count == 0:
                if current_field.strip():
                    fields.append(current_field.strip())
                current_field = ""
                continue
            
            current_field += char
        
        # Add the last field
        if current_field.strip():
            fields.append(current_field.strip())
        
        # Parse each field to extract field name and alias
        parsed_fields = []
        for field in fields:
            field = field.strip()
            field_info = self._parse_field_with_alias(field)
            parsed_fields.append(field_info)
        
        return parsed_fields
    
    def _parse_field_with_alias(self, field: str) -> Dict[str, str]:
        """Parse a field expression to extract field name and alias"""
        field = field.strip()
        # Consolidated patterns to capture aliases in forms:
        #  - <expr> AS "alias"  (double-quoted)
        #  - <expr> AS 'alias'    (single-quoted)
        #  - <expr> AS `alias`    (backtick-quoted)
        #  - <expr> AS alias      (unquoted identifier)
        m = re.match(r'^(.+?)\s+AS\s+(?:"([^"]+)"|\'([^\']+)\'|`([^`]+)`|([\w\.]+))$', field, re.IGNORECASE)
        if m:
            expr = m.group(1).strip()
            alias = None
            # alias will be in one of groups 2..5
            for g in m.groups()[1:]:
                if g:
                    alias = g.strip()
                    break
            return {'field': expr, 'alias': alias}

        # Implicit quoted alias forms: <expr> "alias" | <expr> 'alias' | <expr> `alias`
        m = re.match(r'^(.+?)\s+(?:"([^"]+)"|\'([^\']+)\'|`([^`]+)`)$', field)
        if m:
            expr = m.group(1).strip()
            alias = None
            for g in m.groups()[1:]:
                if g:
                    alias = g.strip()
                    break
            return {'field': expr, 'alias': alias}

        # Fallback: treat last token as alias when it looks like an identifier (not SQL keyword or sort specifier)
        parts = field.split()
        if len(parts) >= 2:
            last_part = parts[-1]
            lower = last_part.lower()
            if lower not in ['asc', 'desc', 'nulls', 'first', 'last'] and not last_part.startswith('('):
                field_expr = ' '.join(parts[:-1])
                return {'field': field_expr.strip(), 'alias': last_part.strip()}

        # No alias found
        return {'field': field, 'alias': None}
    
    def _extract_where_conditions(self, query: str) -> List[str]:
        """Extract WHERE conditions from the query"""
        # Find the top-level WHERE clause by scanning and tracking parentheses.
        q = query
        where_pos = -1
        paren_count = 0
        # scan for WHERE at top level
        for m in re.finditer(r'\bWHERE\b', q, re.IGNORECASE):
            idx = m.start()
            # count parentheses up to this position
            paren_count = q[:idx].count('(') - q[:idx].count(')')
            if paren_count == 0:
                where_pos = m.end()
                break

        if where_pos == -1:
            return []

        # Now find the end of the WHERE clause: the next top-level keyword among ORDER BY, GROUP BY, HAVING, LIMIT, OFFSET
        end_pos = len(q)
        for m in re.finditer(r'\b(ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET)\b', q[where_pos:], re.IGNORECASE):
            idx = where_pos + m.start()
            paren_count = q[:idx].count('(') - q[:idx].count(')')
            if paren_count == 0:
                end_pos = idx
                break

        where_clause = q[where_pos:end_pos].strip()
        
        # Split by AND/OR to get individual conditions (simple split; grouping lost)
        conditions = re.split(r'\s+(?:AND|OR)\s+', where_clause, flags=re.IGNORECASE)
        
        # Clean up conditions and extract field references
        cleaned_conditions = []
        for condition in conditions:
            condition = condition.strip()
            if condition:
                # Extract the field being compared (left side of comparison operators)
                field_match = re.match(r'([^\s<>=!]+)', condition)
                if field_match:
                    field = field_match.group(1).strip()
                    cleaned_conditions.append(field)
        
        return cleaned_conditions
    
    def _extract_order_by_fields(self, query: str) -> List[Dict[str, str]]:
        """Extract ORDER BY fields and their directions"""
        # Find the ORDER BY clause
        order_match = re.search(r'ORDER\s+BY\s+(.*?)(?:\s+LIMIT|\s+OFFSET|$)', query, re.IGNORECASE | re.DOTALL)
        if not order_match:
            return []
        
        order_clause = order_match.group(1).strip()
        
        # Split by comma to get individual order fields
        order_fields = []
        for field_expr in order_clause.split(','):
            field_expr = field_expr.strip()
            if field_expr:
                # Check for direction (ASC/DESC)
                parts = field_expr.split()
                field = parts[0].strip()
                direction = parts[1].upper() if len(parts) > 1 else 'ASC'
                order_fields.append({
                    'field': field,
                    'direction': direction
                })
        
        return order_fields
    
    def _extract_parameters(self, query: str) -> List[str]:
        """Extract parameters from the query (like $P{param_name})"""
        parameters = re.findall(self.parameter_pattern, query)
        return list(set(parameters))  # Remove duplicates
    
    def _validate_field_names(self, parsed_fields: List[Dict[str, str]]) -> None:
        """Validate that every SELECT field has a unique alias"""
        seen = set()

        for field_info in parsed_fields:
            alias = field_info.get('alias')

            if not alias:
                raise MissingAliasError(f"Field '{field_info['field']}' must have an alias. All SELECT fields require unique aliases.")

            # Normalize alias for comparison: strip surrounding whitespace/quotes/backticks and compare case-insensitive
            normalized = alias.strip().strip('"').strip("'").strip('`').strip().lower()

            if normalized in seen:
                raise DuplicateFieldError(f"Duplicate alias found: '{alias}'. Each field must have a unique alias.")
            seen.add(normalized)


class JRXMLJsonGenerator:
    """Generator for JRXML JSON structure from SQL queries"""
    
    def __init__(self):
        self.parser = SQLQueryParser()
        
    def _get_institute_header(self) -> Dict[str, str]:
        """
        Fetch institute header information from it_institute table
        
        Returns:
            Dictionary containing header information for different languages
        """
        try:
            with get_session() as session:
                # Get the first active institute record
                statement = select(ItInstitute.name_ln1, ItInstitute.name_ln2, ItInstitute.name_ln3).where(
                    ItInstitute.status == 1
                ).limit(1)
                
                result = session.exec(statement).first()
                
                if result:
                    return {
                        'header_en': result.name_ln1 or '',
                        'header_si': result.name_ln2 or '',
                        'header_ta': result.name_ln3 or ''
                    }
                else:
                    # Return empty headers if no institute found
                    return {
                        'header_en': '',
                        'header_si': '',
                        'header_ta': ''
                    }
        except Exception as e:
            logger.error(f"Error fetching institute header: {e}")
            return {
                'header_en': '',
                'header_si': '',
                'header_ta': ''
            }
        
    def generate_jrxml_json(self, base_query: str) -> Dict[str, Any]:
        """
        Generate JRXML JSON structure from a base SQL query.
        Adds validation to prevent DML (INSERT/UPDATE/DELETE) except for __temp_ tables,
        and enforces temp table naming convention.

        Args:
            base_query: The SQL SELECT query
        Returns:
            Dictionary containing the JRXML JSON structure
        Raises:
            MissingAliasError: If any SELECT field is missing an alias
            DuplicateFieldError: If duplicate aliases are found
            BaseQueryValidationError: If DML is used on non-temp tables or temp table naming is invalid
        """
        self.validate_base_query(base_query)
        
        # Strip comments from the query before processing but keep original for reference
        cleaned_query = strip_sql_comments(base_query)
        parsed = self.parser.parse_query(cleaned_query)
        self.parser._validate_field_names(parsed['select_fields'])

        # Rebuild the SELECT clause using backtick-quoted aliases to ensure
        # jrxml_json contains queries with backticks only for aliases.
        try:
            select_parts = []
            for f in parsed['select_fields']:
                fld = f.get('field')
                alias = f.get('alias')
                if alias:
                    # ensure alias is safe (no surrounding quotes/backticks)
                    safe_alias = alias.strip().strip('"').strip("'").strip('`')
                    select_parts.append(f"{fld} AS `{safe_alias}`")
                else:
                    select_parts.append(fld)

            reconstructed_select = ', '.join(select_parts)
            # Replace only the first SELECT ... FROM occurrence
            rebuilt_query = re.sub(r'(SELECT\s+)(.*?)(\s+FROM\b)', r"\1" + reconstructed_select + r"\3", cleaned_query, flags=re.IGNORECASE | re.DOTALL, count=1)
        except Exception:
            # Fallback to the cleaned query if something goes wrong
            rebuilt_query = cleaned_query
        
        # Get institute header information
        institute_header = self._get_institute_header()
        
        jrxml_json = {
            "base_query": rebuilt_query,  # Use reconstructed query with backtick aliases
            "original_base_query": rebuilt_query,
            "headings": {
                "main_heading": "",
                "sub_heading": ""
            },
            "it_institute_header": institute_header,
            "parameters": self._generate_parameters(parsed['parameters']),
            "report_name": "",
            "search_fields": self._generate_search_fields(parsed['where_conditions']),
            "select_fields": self._generate_select_fields(parsed['select_fields']),
            "sort_fields": parsed['order_by_fields']
        }
        return jrxml_json

    def validate_base_query(self, sql: str):
        """
        Validates that the SQL does not contain INSERT/UPDATE/DELETE except for __temp_ tables,
        and that all temp tables are named with __temp_ prefix.
        Raises BaseQueryValidationError if invalid usage is found.
        """
        # Remove comments for accurate parsing using the centralized utility
        sql_clean = strip_sql_comments(sql)

        # To avoid false positives (e.g., aliases or string literals containing the words
        # INSERT/UPDATE/DELETE such as ``AS `Update Type`` or "Update" in strings),
        # remove quoted/backticked/bracketed content before scanning for DML keywords.
        def _remove_quoted_parts(s: str) -> str:
            # Remove backtick-quoted identifiers, single-quoted strings, double-quoted strings,
            # and bracketed identifiers by replacing them with a space so positions remain similar.
            return re.sub(r'`[^`]*`|\'[^\']*\'|"[^"]*"|\[[^\]]*\]', ' ', s)

        sql_for_dml = _remove_quoted_parts(sql_clean)

        # Find all DML statements
        dml_pattern = re.compile(r'\b(INSERT|UPDATE|DELETE)\b', re.IGNORECASE)
        # Find all table names used in DML (we search on the sanitized string)
        dml_table_pattern = re.compile(r'\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([\w\[\]\.]+)', re.IGNORECASE)
        # Find all temp table creations
        create_temp_pattern = re.compile(r'CREATE\s+TABLE\s+([\w\[\]\.]+)', re.IGNORECASE)

        # Check DML statements (use sanitized string for matching table names)
        for match in dml_table_pattern.finditer(sql_for_dml):
            action, table = match.groups()
            # Remove brackets if present
            table_name = table.replace('[', '').replace(']', '')
            if not table_name.lower().startswith('__temp_'):
                raise BaseQueryValidationError(f"DML statement '{action}' is only allowed on temporary tables prefixed with __temp_. Found: {table_name}")

        # Check all temp table creations use __temp_ prefix (use sanitized string)
        for match in create_temp_pattern.finditer(sql_for_dml):
            table = match.group(1)
            table_name = table.replace('[', '').replace(']', '')
            if not table_name.lower().startswith('__temp_'):
                raise BaseQueryValidationError(f"Temporary tables must be named with the __temp_ prefix. Found: {table_name}")

        # Check for any DML keywords not matched above (e.g., INSERT/UPDATE/DELETE without table)
        for match in dml_pattern.finditer(sql_for_dml):
            idx = match.start()
            # Use the sanitized string to inspect nearby context for __temp_ presence
            context = sql_for_dml[max(0, idx-40):idx+40]
            if not re.search(r'__temp_', context, re.IGNORECASE):
                # Report using original cleaned SQL for clearer context in error message
                orig_idx = max(0, idx-40)
                orig_context = sql_clean[orig_idx:orig_idx+80]
                raise BaseQueryValidationError(f"DML statement '{match.group(1)}' is not allowed except for __temp_ tables. Context: {orig_context.strip()}")
    
    def _generate_parameters(self, param_names: List[str]) -> List[Dict[str, Any]]:
        """Generate parameter definitions from parameter names found in the query"""
        parameters = []
        
        # Analyze each parameter dynamically based on its usage in the query
        for param_name in param_names:
            param_def = self._analyze_parameter_context(param_name)
            parameters.append(param_def)
        
        return parameters
    
    def _analyze_parameter_context(self, param_name: str) -> Dict[str, Any]:
        """Analyze parameter context from the query to determine its characteristics"""
        query = getattr(self.parser, 'last_query', "")
        
        # Default parameter definition
        param_def = {
            'class': 'java.lang.String',
            'description': f'Parameter {param_name}',
            'field': param_name,
            'name': param_name,
            'reference': param_name,
            'table': 'unknown'
        }
        
        # Try to find the parameter usage context in the query
        param_pattern = rf'\$P\{{{param_name}\}}'
        
        # Look for the parameter in different contexts
        if query:
            # Find the context where the parameter is used
            param_contexts = re.finditer(param_pattern, query, re.IGNORECASE)
            
            for match in param_contexts:
                start_pos = max(0, match.start() - 100)  # Look 100 chars before
                end_pos = min(len(query), match.end() + 100)  # Look 100 chars after
                context = query[start_pos:end_pos]
                
                # Analyze the context to determine parameter characteristics
                param_def.update(self._infer_parameter_type_from_context(context, param_name))
                break  # Use the first occurrence
        
        return param_def
    
    def _infer_parameter_type_from_context(self, context: str, param_name: str) -> Dict[str, str]:
        """Infer parameter type and details from its usage context"""
        context_lower = context.lower()
        param_pattern = rf'\$p\{{{param_name}\}}'
        
        # Look for field references near the parameter
        field_match = re.search(rf'(\w+\.\w+)\s*=\s*{param_pattern}', context, re.IGNORECASE)
        if field_match:
            field_ref = field_match.group(1)
            table_name, field_name = field_ref.split('.', 1)
            
            # Determine class based on field name patterns
            java_class = 'java.lang.String'  # default
            if any(keyword in field_name.lower() for keyword in ['id', 'count', 'number', 'amount', 'balance']):
                if 'id' in field_name.lower():
                    java_class = 'java.lang.Integer'
                elif any(keyword in field_name.lower() for keyword in ['amount', 'balance', 'rate']):
                    java_class = 'java.math.BigDecimal'
            elif any(keyword in field_name.lower() for keyword in ['date', 'time']):
                java_class = 'java.util.Date'
            
            return {
                'class': java_class,
                'description': f'Parameter for {field_ref} filtering',
                'field': field_name,
                'reference': field_ref,
                'table': table_name
            }
        
        # If no specific field reference found, try to infer from parameter name
        return self._infer_from_parameter_name(param_name)
    
    def _infer_from_parameter_name(self, param_name: str) -> Dict[str, str]:
        """Infer parameter characteristics from parameter name itself"""
        param_lower = param_name.lower()
        
        # Determine class based on parameter name patterns
        java_class = 'java.lang.String'  # default
        description = f'Parameter {param_name}'
        
        if any(keyword in param_lower for keyword in ['id', 'number', 'count']):
            java_class = 'java.lang.Integer'
            description = f'ID parameter {param_name}'
        elif any(keyword in param_lower for keyword in ['date', 'time']):
            java_class = 'java.util.Date'
            description = f'Date parameter {param_name}'
        elif any(keyword in param_lower for keyword in ['amount', 'balance', 'rate', 'value']):
            java_class = 'java.math.BigDecimal'
            description = f'Numeric parameter {param_name}'
        
        return {
            'class': java_class,
            'description': description,
            'field': param_name,
            'reference': param_name,
            'table': 'unknown'
        }
    
    def _generate_search_fields(self, where_conditions: List[str]) -> List[Dict[str, Any]]:
        """Generate search fields from WHERE conditions"""
        search_fields = []
        
        for condition in where_conditions:
            search_fields.append({
                'isChecked': True,
                'name_en': condition
            })
        
        return search_fields
    
    def _generate_select_fields(self, select_fields: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Generate select fields from SELECT clause - all fields must have aliases. name_en is the full field expression as in the base_query."""
        fields = []
        for field_info in select_fields:
            field = field_info['field']
            alias = field_info['alias']
            # Compose the full field expression as in the base_query
            if alias:
                full_expr = f"{field} AS {alias}"
            else:
                full_expr = field
            field_data = {
                'isChecked': True,
                'name_en': full_expr,
                'alignment': 'left'
            }
            fields.append(field_data)
        return fields


def generate_jrxml_from_query(base_query: str) -> Dict[str, Any]:
    """
    Standalone function to generate JRXML JSON from a SQL query
    
    Args:
        base_query: The SQL SELECT query
        
    Returns:
        Dictionary containing the JRXML JSON structure
        
    Raises:
        MissingAliasError: If any SELECT field is missing an alias
        DuplicateFieldError: If duplicate aliases are found
    """
    generator = JRXMLJsonGenerator()
    return generator.generate_jrxml_json(base_query)