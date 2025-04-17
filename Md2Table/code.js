figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = async (msg) => {
  console.log('Main script received:', msg);
  if (msg.type === 'convert-to-table') {
    console.log('Processing table with markdown:', msg.markdown);
    await createTableFromMarkdown(msg.markdown);
  } else if (msg.type === 'convert-to-cube') {
    console.log('Processing cube with markdown:', msg.content);
    await createCubeFromMarkdown(msg.content);
  }
};

// 处理表格的函数
async function createTableFromMarkdown(markdown) {
  figma.currentPage.children.forEach(node => {
    if (node.name === 'Markdown Table') {
      node.remove();
    }
  });

  const lines = markdown.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) return;

  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h.length > 0);
  const rows = lines.slice(2)
    .map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0))
    .filter(row => row.length > 0);

  const cellHeight = 89;
  const rowSpacing = 0;
  const tableWidth = 630;

  const tableFrame = figma.createFrame();
  tableFrame.name = 'Markdown Table by Donyan ^_^';
  tableFrame.layoutMode = 'VERTICAL';
  tableFrame.itemSpacing = rowSpacing;
  tableFrame.paddingLeft = 0;
  tableFrame.paddingRight = 0;
  tableFrame.paddingTop = 0;
  tableFrame.paddingBottom = 0;
  tableFrame.fills = [{ type: 'SOLID', color: { r: 226 / 255, g: 226 / 255, b: 226 / 255 } }];
  tableFrame.cornerRadius = 20;

  const numColumns = Math.max(headers.length, ...rows.map(row => row.length));
  const cellWidth = (tableWidth - 20 - (numColumns - 1) * 5) / numColumns;

  const headerRow = createRowFrame(headers, cellWidth, cellHeight, true, numColumns, tableWidth, 20, { r: 201 / 255, g: 201 / 255, b: 201 / 255 });
  tableFrame.appendChild(headerRow);

  rows.forEach((row, rowIndex) => {
    const rowFrame = createRowFrame(row, cellWidth, cellHeight, false, numColumns, tableWidth, 16, { r: 226 / 255, g: 226 / 255, b: 226 / 255 });
    tableFrame.appendChild(rowFrame);
  });

  tableFrame.resize(tableWidth, (cellHeight + rowSpacing) * (rows.length + 1));
  figma.currentPage.appendChild(tableFrame);
  figma.viewport.scrollAndZoomIntoView([tableFrame]);
}

function createRowFrame(cells, cellWidth, cellHeight, isHeader, numColumns, tableWidth, fontSize, bgColor) {
  const rowFrame = figma.createFrame();
  rowFrame.name = isHeader ? 'Header' : '';
  rowFrame.resize(tableWidth, cellHeight);
  rowFrame.fills = [{ type: 'SOLID', color: bgColor }];

  cells.forEach((cellText, colIndex) => {
    const xPosition = colIndex * (cellWidth + 5);
    const textNode = createTextNode(cellText, xPosition, 0, cellWidth, cellHeight, isHeader, fontSize);
    rowFrame.appendChild(textNode);
  });

  return rowFrame;
}

// 处理文本的函数（Cube）
async function createCubeFromMarkdown(markdown) {
  console.log('Creating cube from markdown');

  // 清除所有 ** 标记（加粗）
  markdown = markdown.replace(/\*\*(.*?)\*\*/g, '$1'); // 去掉所有 ** 标记

  // 清空之前的 Cube 节点
  figma.currentPage.children.forEach(node => {
    if (node.name === 'Content Cube') {
      node.remove();
    }
  });

  // 创建主 Layout
  const cubeLayout = figma.createFrame();
  cubeLayout.name = 'Content Cube';
  cubeLayout.layoutMode = 'VERTICAL';
  cubeLayout.itemSpacing = 10;
  cubeLayout.paddingLeft = 28;
  cubeLayout.paddingRight = 28;
  cubeLayout.paddingTop = 28;
  cubeLayout.paddingBottom = 28;
  cubeLayout.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // 白色背景
  cubeLayout.cornerRadius = 20; // 圆角 20
  cubeLayout.resize(630, 100);  // 初始宽度 630

  const lines = markdown.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let yPosition = 0;

  for (const line of lines) {
    let textContent = line;
    let fontSize = 16;
    let align = 'LEFT'; // 默认左对齐
    let isBold = false; // 是否加粗
    let lineHeight = undefined; // 行高（如果需要设置）

    // 解析 Markdown 格式
    if (line.startsWith('# ')) {
      textContent = line.replace(/^#\s*/, '');  // 去除 # 符号和空格
      fontSize = 24;
      isBold = true;
      align = 'CENTER'; // 标题居中
      lineHeight = 50;  // 设置行高为 50
    } else if (line.startsWith('## ')) {
      textContent = line.replace(/^##\s*/, '');  // 去除 ## 符号和空格
      fontSize = 20;
      isBold = true;
    } else if (line.startsWith('### ')) {
      textContent = line.replace(/^###\s*/, '');  // 去除 ### 符号和空格
      fontSize = 18;
      isBold = true;
    } else if (line.match(/^\d+\.\s/)) {
      // 有序列表
      textContent = line.replace(/^\d+\.\s/, match => `${match}`);
    } else if (line.startsWith('- ')) {
      // 无序列表
      textContent = '• ' + line.replace('- ', '');
    }

    console.log('Adding line:', textContent, 'fontSize:', fontSize, 'isBold:', isBold, 'align:', align); // 调试
    const textNode = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: isBold ? 'Bold' : 'Regular' });
    textNode.fontName = { family: 'Inter', style: isBold ? 'Bold' : 'Regular' };
    textNode.characters = textContent;
    textNode.fontSize = fontSize;
    textNode.x = 0;
    textNode.y = yPosition;
    textNode.resize(630 - 56, textNode.height); // 宽度减去左右 padding (28 * 2)
    textNode.textAlignHorizontal = align; // 设置对齐方式
    textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

    // 如果是带有 # 的标题，设置行高
    if (line.startsWith('# ')) {
      textNode.lineHeight = { value: 50, unit: 'PIXELS' };  // 设置行高
    }

    cubeLayout.appendChild(textNode);
    yPosition += textNode.height + 10;
  }

  // 如果没有任何内容，显示默认文本
  if (yPosition === 0) {
    const textNode = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.characters = 'No valid content found';
    textNode.fontSize = 16;
    textNode.x = 0;
    textNode.y = yPosition;
    textNode.resize(630 - 56, textNode.height);
    textNode.textAlignHorizontal = 'LEFT';
    textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    cubeLayout.appendChild(textNode);
    yPosition += textNode.height + 10;
  }

  // 调整 Layout 高度并添加到画布
  cubeLayout.resize(630, yPosition + 56); // 加上上下 padding (28 * 2)
  figma.currentPage.appendChild(cubeLayout);
  figma.viewport.scrollAndZoomIntoView([cubeLayout]);
  console.log('Cube created');
}







function createTextNode(text, x, y, width, height, isHeader, fontSize) {
  const textNode = figma.createText();
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }).then(() => {
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.characters = text || '';
    textNode.resize(width - 10, height - 10);
    textNode.x = x + 5;
    textNode.y = y + 5;
    textNode.textAlignHorizontal = 'CENTER';
    textNode.textAlignVertical = 'CENTER';
    textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    textNode.fontSize = fontSize;
  });

  return textNode;
}