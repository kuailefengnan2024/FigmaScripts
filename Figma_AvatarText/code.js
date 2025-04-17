// 显示 UI - 初始高度设置小一些，会被自动调整
figma.showUI(__html__, { width: 350, height: 150 });

// --- Helper Function to Generate One Circular Text Group (Now Ungrouped Nodes) ---
async function generateCircularText(textToGenerate, letterSpacing, itemIndex, centerX, centerY) {
  const text = textToGenerate.trim();
  if (!text || text.length === 0) {
    return 0;
  }

  const radius = 130;
  const fontSize = 26;
  const color = { r: 1, g: 1, b: 1 };
  const charCount = text.length;

  // --- Define widths and spacings ---
  const defaultAngularSpacing = letterSpacing / radius;
  const halfAngularSpacing = (letterSpacing / 2) / radius;
  // Estimate different angular widths
  const defaultCharAngularWidth = fontSize / radius; // For CJK etc.
  const letterNumAngularWidth = (fontSize * 0.65) / radius; // Smaller width for letters/numbers (adjust factor if needed)
  const numeralOrLetterRegex = /^[0-9a-zA-Z]$/;

  // --- Pre-calculate exact total arc required ---
  let preciseTotalArcRequired = 0;
  for (let i = 0; i < charCount; i++) {
    const currentChar = text[i];
    const isLetterNum = numeralOrLetterRegex.test(currentChar);
    const currentCharWidth = isLetterNum ? letterNumAngularWidth : defaultCharAngularWidth;
    
    preciseTotalArcRequired += currentCharWidth;
    
    if (i < charCount - 1) { // Add spacing if not the last character
      preciseTotalArcRequired += isLetterNum ? halfAngularSpacing : defaultAngularSpacing;
    }
  }
  // --- End Pre-calculation ---

  // Calculate starting angle based on precise total arc
  const firstCharLeadingEdgeAngle = -Math.PI / 2 - preciseTotalArcRequired / 2;

  const nodes = [];
  let currentLeadingEdgeAngle = firstCharLeadingEdgeAngle;

  for (let i = 0; i < charCount; i++) {
    const char = text[i];
    const isLetterNum = numeralOrLetterRegex.test(char);
    const currentCharWidth = isLetterNum ? letterNumAngularWidth : defaultCharAngularWidth;
    
    // Calculate center angle for the current character
    const placementAngle = currentLeadingEdgeAngle + currentCharWidth / 2;
    const x = centerX + radius * Math.cos(placementAngle);
    const y = centerY + radius * Math.sin(placementAngle);

    const textNode = figma.createText();
    textNode.x = x;
    textNode.y = y;
    textNode.rotation = -(placementAngle * (180 / Math.PI) + 90);
    textNode.characters = char;
    textNode.fontSize = fontSize;
    textNode.fills = [{ type: 'SOLID', color }];
    textNode.textAlignHorizontal = 'CENTER';
    textNode.textAlignVertical = 'CENTER';
    nodes.push(textNode);

    // Determine spacing for the *next* step based on the *current* character
    let spacingForNextStep = 0;
    if (i < charCount - 1) {
      spacingForNextStep = isLetterNum ? halfAngularSpacing : defaultAngularSpacing;
    }
    
    // Update currentLeadingEdgeAngle for the next character's starting edge
    currentLeadingEdgeAngle += currentCharWidth + spacingForNextStep;
  }

  if (nodes.length > 0) {
    return 1; 
  } else {
    return 0; 
  }
}
// --- End Helper Function ---

figma.ui.onmessage = async msg => {
  if (msg.type === 'generate') {
    const rawInputText = msg.text;
    const letterSpacing = msg.letterSpacing || 5;

    if (!rawInputText || rawInputText.trim().length === 0) {
      figma.notify('请输入文案');
      return;
    }

    // --- Markdown Table Parsing Logic ---
    const lines = rawInputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const tableRows = lines.filter(line => line.startsWith('|') && line.endsWith('|'));
    let cellContents = [];
    let isTable = false;

    // Basic table detection: at least 2 rows, second row is separator
    if (tableRows.length >= 2 && /\|.*---.*\|/.test(tableRows[1])) { 
      isTable = true;
      // Skip header (row 0) and separator (row 1)
      for (let i = 2; i < tableRows.length; i++) {
        const row = tableRows[i];
        const cells = row.slice(1, row.length - 1).split('|').map(cell => cell.trim());
        cellContents.push(...cells);
      }
      // Filter out any potentially empty strings resulting from split
      cellContents = cellContents.filter(content => content.length > 0); 
    }
    // --- End Parsing Logic ---

    // --- Generation Logic ---
    let generatedItemCount = 0; // Count of items (cells/full text) processed
    const groupWidthEstimate = 280; 
    const groupSpacing = 50;      
    const initialViewportCenter = figma.viewport.center;

    if (isTable && cellContents.length > 0) {
      figma.notify(`检测到表格，正在为 ${cellContents.length} 个单元格生成文字...`, { timeout: 1500 });
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        
        const totalRowWidth = cellContents.length * groupWidthEstimate + (cellContents.length - 1) * groupSpacing;
        let currentX = initialViewportCenter.x - totalRowWidth / 2 + groupWidthEstimate / 2;
        const currentY = initialViewportCenter.y; 

        for (let i = 0; i < cellContents.length; i++) {
          generatedItemCount += await generateCircularText(cellContents[i], letterSpacing, i, currentX, currentY);
          currentX += groupWidthEstimate + groupSpacing;
        }

        if (generatedItemCount > 0) {
          figma.notify(`为 ${generatedItemCount} 个单元格生成了环绕文字`);
        } else {
          figma.notify('表格单元格均为空或生成失败');
        }
      } catch (e) {
        figma.notify('生成过程中出错: ' + e.message);
        console.error('Error generating from table:', e);
      }
    } else {
      figma.notify('未检测到有效表格或表格为空，按全文生成... ', { timeout: 1500 });
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        generatedItemCount = await generateCircularText(rawInputText, letterSpacing, 0, initialViewportCenter.x, initialViewportCenter.y);
        if (generatedItemCount > 0) {
          figma.notify('生成了环绕文字 (未分组)');
        } else {
           figma.notify('内容为空或生成失败');
        }
      } catch (e) {
        figma.notify('生成过程中出错: ' + e.message);
        console.error('Error generating single text:', e);
      }
    }

  } else if (msg.type === 'resize') {
    const newHeight = Math.max(150, Math.ceil(msg.height));
    figma.ui.resize(350, newHeight);
  }
};
