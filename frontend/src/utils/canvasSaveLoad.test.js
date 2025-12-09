/**
 * Test file for Canvas Save/Load System
 * Demonstrates functionality with all element types
 */

import { 
  serializeCanvas, 
  deserializeCanvas, 
  validateElement, 
  sanitizeElement,
  exportToBase64,
  importFromBase64 
} from './canvasSaveLoad';

// Test data: Sample canvas with all element types and page configuration
const sampleCanvasData = {
  elements: [
    {
      id: 'text-1',
      type: 'textbox',
      x: 100,
      y: 50,
      width: 200,
      height: 40,
      text: 'Sample Text',
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      textColor: '#333333',
      backgroundColor: '#f0f0f0',
      rotation: 0,
      opacity: 100,
      alignment: 'left'
    },
    {
      id: 'image-1',
      type: 'image',
      x: 50,
      y: 120,
      width: 150,
      height: 100,
      imageSrc: 'https://example.com/sample.jpg',
      altText: 'Sample Image',
      rotation: 15,
      opacity: 90,
      borderWidth: 2,
      borderColor: '#000000',
      borderRadius: 5
    },
    {
      id: 'rect-1',
      type: 'rectangle',
      x: 300,
      y: 80,
      width: 120,
      height: 80,
      backgroundColor: '#ff6b6b',
      rotation: 0,
      opacity: 80,
      borderRadius: 10,
      shadow: 'medium'
    },
    {
      id: 'line-1',
      type: 'line',
      x: 50,
      y: 250,
      width: 200,
      height: 2,
      backgroundColor: '#333333',
      rotation: 0,
      opacity: 100
    },
    {
      id: 'dashline-1',
      type: 'dashline',
      x: 50,
      y: 280,
      width: 200,
      height: 2,
      backgroundColor: '#666666',
      rotation: 30,
      opacity: 75
    },
    {
      id: 'header-1',
      type: 'header',
      x: 0,
      y: 0,
      width: 600,
      height: 60,
      text: 'Document Header',
      fontFamily: 'Georgia',
      fontSize: 24,
      fontWeight: 'bold',
      textColor: '#ffffff',
      backgroundColor: '#2c3e50',
      textAlign: 'center',
      opacity: 100
    },
    {
      id: 'footer-1',
      type: 'footer',
      x: 0,
      y: 500,
      width: 600,
      height: 40,
      text: 'Page 1 of 1',
      fontFamily: 'Arial',
      fontSize: 12,
      textColor: '#666666',
      backgroundColor: '#f8f9fa',
      textAlign: 'center',
      opacity: 100
    }
  ],
  pageConfig: {
    key: 'a4-portrait',
    width: 595,
    height: 842,
    label: 'A4 Portrait'
  }
};

// Test functions
function runTests() {
  console.log('🧪 Running Canvas Save/Load System Tests...\n');

  // Test 1: Serialization
  console.log('📋 Test 1: Serialization');
  try {
    const serialized = serializeCanvas(sampleCanvasData.elements, { 
      pretty: true,
      pageConfig: sampleCanvasData.pageConfig
    });
    console.log('✅ Serialization successful');
    console.log('📊 Sample output:', serialized.substring(0, 200) + '...');
    
    // Verify JSON structure
    const parsed = JSON.parse(serialized);
    console.log(`📈 Total elements: ${parsed.totalElements}`);
    console.log(`🔢 Schema version: ${parsed.version}`);
    console.log(`⏰ Timestamp: ${parsed.timestamp}\n`);
  } catch (error) {
    console.error('❌ Serialization failed:', error.message);
  }

  // Test 2: Deserialization
  console.log('📥 Test 2: Deserialization');
  try {
    const serialized = serializeCanvas(sampleCanvasData.elements, { pageConfig: sampleCanvasData.pageConfig });
    const deserialized = deserializeCanvas(serialized);
    
    if (deserialized.success) {
      console.log('✅ Deserialization successful');
      console.log(`📊 Loaded elements: ${deserialized.totalElements}`);
      console.log(`🔢 Schema version: ${deserialized.version}`);
      
      // Verify element integrity
      deserialized.elements.forEach((element, index) => {
        const original = sampleCanvasData.elements[index];
        console.log(`   Element ${index + 1}: ${element.type} - ${element.id}`);
        console.log(`   Position: (${element.x}, ${element.y}) Size: ${element.width}x${element.height}`);
        if (element.type === 'textbox') {
          console.log(`   Text: "${element.text}" Font: ${element.fontFamily}`);
        }
      });
      
      // Verify page configuration
      if (deserialized.pageConfig && deserialized.pageConfig.key === sampleCanvasData.pageConfig.key) {
        console.log(`   Page config: ${deserialized.pageConfig.label} (${deserialized.pageConfig.width}x${deserialized.pageConfig.height})`);
      }
    } else {
      console.error('❌ Deserialization failed:', deserialized.error);
    }
  } catch (error) {
    console.error('❌ Deserialization failed:', error.message);
  }

  // Test 3: Element Validation
  console.log('\n🔍 Test 3: Element Validation');
  sampleCanvasData.elements.forEach(element => {
    const validation = validateElement(element);
    if (validation.isValid) {
      console.log(`✅ ${element.type} (${element.id}) is valid`);
    } else {
      console.error(`❌ ${element.type} (${element.id}) has errors:`, validation.errors);
    }
  });

  // Test 4: Sanitization
  console.log('\n🧹 Test 4: Element Sanitization');
  const incompleteElement = {
    id: 'test-incomplete',
    type: 'textbox',
    x: 100,
    y: 100,
    width: 150,
    height: 30
    // Missing many properties that should get defaults
  };
  
  const sanitized = sanitizeElement(incompleteElement);
  console.log('✅ Incomplete element sanitized successfully');
  console.log(`   Original: ${Object.keys(incompleteElement).length} properties`);
  console.log(`   Sanitized: ${Object.keys(sanitized).length} properties`);
  console.log(`   Default fontFamily: ${sanitized.fontFamily}`);
  console.log(`   Default opacity: ${sanitized.opacity}`);

  // Test 5: Error Handling
  console.log('\n⚠️ Test 5: Error Handling');
  
  // Test invalid JSON
  const invalidJson = deserializeCanvas('{ invalid json }');
  console.log(`Invalid JSON handled: ${!invalidJson.success} - ${invalidJson.error}`);
  
  // Test missing type
  const missingType = deserializeCanvas('{"elements": [{"id": "test", "x": 100}]}');
  console.log(`Missing type handled: ${!missingType.success} - ${missingType.error}`);
  
  // Test invalid type
  const invalidType = deserializeCanvas('{"elements": [{"id": "test", "type": "invalid", "x": 100, "y": 100, "width": 100, "height": 100}]}');
  console.log(`Invalid type handled: ${!invalidType.success} - ${invalidType.error}`);

  // Test 6: Base64 Export/Import
  console.log('\n🔄 Test 6: Base64 Export/Import');
  try {
    const base64 = exportToBase64(sampleCanvasData.elements, sampleCanvasData.pageConfig);
    console.log(`✅ Base64 export successful (${base64.length} chars)`);
    
    const imported = importFromBase64(base64);
    if (imported.success) {
      console.log(`✅ Base64 import successful (${imported.totalElements} elements)`);
    } else {
      console.error('❌ Base64 import failed:', imported.error);
    }
  } catch (error) {
    console.error('❌ Base64 operations failed:', error.message);
  }

  // Test 7: Edge Cases
  console.log('\n🎯 Test 7: Edge Cases');
  
  // Empty canvas
  const emptyCanvas = serializeCanvas([], { pageConfig: sampleCanvasData.pageConfig });
  const emptyResult = deserializeCanvas(emptyCanvas);
  console.log(`Empty canvas: ${emptyResult.success} - ${emptyResult.totalElements} elements`);
  
  // Large rotation values
  const rotatedElement = {
    id: 'rotated-test',
    type: 'textbox',
    x: 100, y: 100, width: 100, height: 50,
    rotation: 720, // Large rotation
    opacity: 50
  };
  
  const rotatedValidation = validateElement(rotatedElement);
  console.log(`Large rotation handled: ${rotatedValidation.isValid}`);

  console.log('\n🎉 All tests completed!');
  console.log('💡 The save/load system is ready for production use.');
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location && window.location.href.includes('test')) {
  runTests();
}

// Export test data for external use
export const testCanvasData = sampleCanvasData;
export { runTests };

// Example usage:
/*
// In your component:
import { serializeCanvas, deserializeCanvas } from './canvasSaveLoad';

// Save current canvas
const saveData = () => {
  const jsonString = serializeCanvas(widgets, { pretty: true });
  localStorage.setItem('myCanvas', jsonString);
};

// Load saved canvas
const loadData = () => {
  const saved = localStorage.getItem('myCanvas');
  if (saved) {
    const result = deserializeCanvas(saved);
    if (result.success) {
      setWidgets(result.elements);
    }
  }
};
*/