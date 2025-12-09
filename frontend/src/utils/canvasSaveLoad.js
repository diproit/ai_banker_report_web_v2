const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Canvas Save/Load System
 * Provides JSON-based serialization and deserialization for canvas elements
 */

/**
 * JSON Schema for canvas elements
 * Supports all element types with common and type-specific properties
 */
export const CANVAS_SCHEMA_VERSION = '1.0.0';

/**
 * Common properties for all canvas elements
 */
const commonProperties = {
  id: { type: 'string', required: true },
  type: { type: 'string', required: true, enum: ['textbox', 'image', 'rectangle', 'line', 'dashline', 'header', 'footer'] },
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  width: { type: 'number', required: true, min: 1 },
  height: { type: 'number', required: true, min: 1 },
  rotation: { type: 'number', default: 0 },
  opacity: { type: 'number', default: 100, min: 0, max: 100 },
  alignment: { type: 'string', default: 'left', enum: ['left', 'center', 'right', 'justify'] },
  color: { type: 'string', default: '#000000' },
  borderWidth: { type: 'number', default: 0, min: 0 },
  borderColor: { type: 'string', default: '#000000' },
  borderRadius: { type: 'number', default: 0, min: 0 },
  shadow: { type: 'string', default: 'none', enum: ['none', 'small', 'medium', 'large', 'custom'] },
  shadowColor: { type: 'string', default: '#000000' },
  shadowBlur: { type: 'number', default: 0, min: 0 },
  shadowOffsetX: { type: 'number', default: 0 },
  shadowOffsetY: { type: 'number', default: 0 },
  filter: { type: 'string', default: 'none' },
  filterIntensity: { type: 'number', default: 100, min: 0, max: 100 },
  responsive: { type: 'object', default: { desktop: true, tablet: true, mobile: true } },
  objectFit: { type: 'string', default: 'fill', enum: ['fill', 'contain', 'cover', 'none', 'scale-down'] }
};

/**
 * Type-specific properties for each element type
 */
const typeSpecificProperties = {
  textbox: {
    text: { type: 'string', default: 'Text' },
    fontFamily: { type: 'string', default: 'Arial' },
    fontSize: { type: 'number', default: 16, min: 1 },
    fontWeight: { type: 'string', default: 'normal', enum: ['normal', 'bold', 'lighter', 'bolder'] },
    fontStyle: { type: 'string', default: 'normal', enum: ['normal', 'italic', 'oblique'] },
    textDecoration: { type: 'string', default: 'none', enum: ['none', 'underline', 'overline', 'line-through'] },
    textColor: { type: 'string', default: '#000000' },
    backgroundColor: { type: 'string', default: 'transparent' },
    textAlign: { type: 'string', default: 'left', enum: ['left', 'center', 'right', 'justify'] },
    lineHeight: { type: 'number', default: 1.5, min: 0.1 },
    letterSpacing: { type: 'number', default: 0 }
  },
  image: {
    imageSrc: { type: 'string', default: null },
    altText: { type: 'string', default: '' }
  },
  rectangle: {
    backgroundColor: { type: 'string', default: 'transparent' }
  },
  line: {
    backgroundColor: { type: 'string', default: '#000000' }
  },
  dashline: {
    backgroundColor: { type: 'string', default: '#000000' }
  },
  header: {
    text: { type: 'string', default: 'Header' },
    fontFamily: { type: 'string', default: 'Arial' },
    fontSize: { type: 'number', default: 24, min: 1 },
    fontWeight: { type: 'string', default: 'bold' },
    textColor: { type: 'string', default: '#000000' },
    backgroundColor: { type: 'string', default: '#f5f5f5' },
    textAlign: { type: 'string', default: 'center' }
  },
  footer: {
    text: { type: 'string', default: 'Footer' },
    fontFamily: { type: 'string', default: 'Arial' },
    fontSize: { type: 'number', default: 12, min: 1 },
    fontWeight: { type: 'string', default: 'normal' },
    textColor: { type: 'string', default: '#666666' },
    backgroundColor: { type: 'string', default: '#f5f5f5' },
    textAlign: { type: 'string', default: 'center' }
  }
};

/**
 * Validates a canvas element against the schema
 * @param {Object} element - The element to validate
 * @returns {Object} - Validation result with isValid flag and errors array
 */
export function validateElement(element) {
  const errors = [];
  
  // Check required common properties
  Object.keys(commonProperties).forEach(prop => {
    const schema = commonProperties[prop];
    if (schema.required && !(prop in element)) {
      errors.push(`Missing required property: ${prop}`);
    }
  });
  
  // Validate element type
  if (!element.type || !typeSpecificProperties[element.type]) {
    errors.push(`Invalid or unsupported element type: ${element.type}`);
    return { isValid: false, errors };
  }
  
  // Validate type-specific properties
  const typeSchema = typeSpecificProperties[element.type];
  Object.keys(typeSchema).forEach(prop => {
    const schema = typeSchema[prop];
    if (schema.required && !(prop in element)) {
      errors.push(`Missing required ${element.type}-specific property: ${prop}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes and normalizes an element based on schema defaults
 * @param {Object} element - The element to sanitize
 * @returns {Object} - Sanitized element with defaults applied
 */
export function sanitizeElement(element) {
  const sanitized = { ...element };
  
  // Apply common property defaults
  Object.keys(commonProperties).forEach(prop => {
    const schema = commonProperties[prop];
    if (!(prop in sanitized) && 'default' in schema) {
      sanitized[prop] = schema.default;
    }
  });
  
  // Apply type-specific defaults
  if (element.type && typeSpecificProperties[element.type]) {
    const typeSchema = typeSpecificProperties[element.type];
    Object.keys(typeSchema).forEach(prop => {
      const schema = typeSchema[prop];
      if (!(prop in sanitized) && 'default' in schema) {
        sanitized[prop] = schema.default;
      }
    });
  }
  
  return sanitized;
}

/**
 * Serializes canvas elements to JSON format
 * @param {Array} widgets - Array of canvas elements
 * @param {Object} options - Serialization options
 * @returns {string} - JSON string representation
 */
export function serializeCanvas(widgets, options = {}) {
  try {
    const canvasData = {
      version: CANVAS_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      totalElements: widgets.length,
      pageConfig: {
        key: options.pageKey || 'a4-portrait',
        width: options.pageWidth || 595,
        height: options.pageHeight || 842,
        label: options.pageLabel || 'A4 Portrait'
      },
      elements: widgets.map(sanitizeElement)
    };
    
    // Add metadata if provided
    if (options.metadata) {
      canvasData.metadata = options.metadata;
    }
    
    return JSON.stringify(canvasData, null, options.pretty ? 2 : 0);
  } catch (error) {
    throw new Error(`Failed to serialize canvas: ${error.message}`);
  }
}

/**
 * Deserializes JSON string to canvas elements
 * @param {string} jsonString - JSON string to deserialize
 * @returns {Object} - Deserialization result with elements and metadata
 */
export function deserializeCanvas(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    
    //Validate schema version
    if (!parsed.version) {
      throw new Error('Invalid canvas data: missing schema version');
    }
    
    if (parsed.version !== CANVAS_SCHEMA_VERSION) {
      console.warn(`Schema version mismatch: expected ${CANVAS_SCHEMA_VERSION}, got ${parsed.version}`);
    }
    
    // Validate elements array
    if (!Array.isArray(parsed.elements)) {
      throw new Error('Invalid canvas data: elements must be an array');
    }
    
    // Validate and sanitize each element
    const elements = parsed.elements.map(element => {
      const validation = validateElement(element);
      if (!validation.isValid) {
        console.warn('Element validation failed:', validation.errors);
      }
      return sanitizeElement(element);
    });
    
    return {
      success: true,
      elements,
      metadata: parsed.metadata || null,
      version: parsed.version,
      timestamp: parsed.timestamp || null,
      totalElements: elements.length,
      pageConfig: parsed.pageConfig || {
        key: 'a4-portrait',
        width: 595,
        height: 842,
        label: 'A4 Portrait'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      elements: [],
      metadata: null
    };
  }
}

/**
 * Creates a downloadable file from canvas data
 * @param {Array} widgets - Array of canvas elements
 * @param {string} filename - Name of the file to download
 * @param {Object} options - Additional options
 * 
 */
export function downloadCanvasFile(widgets, filename = 'canvas-design.json', options = {}) {
  try {
    const jsonString = serializeCanvas(widgets, options);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function storeCanvasFile(widgets, userId, branchId, reportStructureId, reportName,is_active,created_at,updated_at, options = {}) {
  try {
    
    const jsonString = serializeCanvas(widgets, options);
    console.log('jsonString', jsonString);
    const storeUrl = `${API_BASE_URL}/report-design/json_store`;
    const payload = {
    "it_user_master_id": userId,
    "branch_id": branchId,
    "it_report_structure_id": reportStructureId,
    "report_design_json": jsonString,
    "report_design_name": reportName,
    "is_active": is_active,
    "created_at": created_at,
    "updated_at": updated_at
    };

        // 3. Use the fetch API to send the data
        const res = await fetch(storeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // This header is important for telling the server what type of data you are sending
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            // The body of the request is the raw JSON string
            body: JSON.stringify(payload),
        });

        // 4. Handle the server's response
        if (res.ok) {
            // The request was successful (status 200-299)
            const data = await res.json(); // You might want to get a confirmation message from the server
            console.log('Design saved successfully on the server:', data);
            return { success: true, message: 'Design saved successfully!' };
        } else {
            // The request failed
            const errorData = await res.json();
            console.error('Failed to save design:', errorData);
            return { success: false, error: errorData.detail || res.statusText };
        }

    // const blob = new Blob([jsonString], { type: 'application/json' });
    // const url = URL.createObjectURL(blob);
    
    // const link = document.createElement('a');
    // link.href = url;
    // link.download = filename;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
    
    // URL.revokeObjectURL(url);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Loads canvas data from a file input
 * @param {File} file - File object to load
 * @returns {Promise<Object>} - Promise resolving to load result
 */
export function loadCanvasFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = deserializeCanvas(event.target.result);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          elements: []
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
        elements: []
      });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Exports canvas data as base64 string for clipboard
 * @param {Array} widgets - Array of canvas elements
 * @returns {string} - Base64 encoded canvas data
 */
export function exportToBase64(widgets) {
  try {
    const jsonString = serializeCanvas(widgets);
    return btoa(jsonString);
  } catch (error) {
    throw new Error(`Failed to export to base64: ${error.message}`);
  }
}

/**
 * Imports canvas data from base64 string
 * @param {string} base64String - Base64 encoded canvas data
 * @returns {Object} - Import result
 */
export function importFromBase64(base64String) {
  try {
    const jsonString = atob(base64String);
    return deserializeCanvas(jsonString);
  } catch (error) {
    return {
      success: false,
      error: error.message,
      elements: []
    };
  }
}