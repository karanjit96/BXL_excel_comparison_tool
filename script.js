class ExcelComparisonTool {
    constructor() {
        this.files = [];
        this.columnMap = {};
        this.rowCount = 0;
        this.cellStyles = [];
        this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.zoomLevel = 100;
        this.statistics = {
            totalComparisons: 0,
            matches: 0,
            partialMatches: 0,
            mismatches: 0,
            emptyFields: 0
        };
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTheme();
    }

    initializeElements() {
        // Views
        this.initialView = document.getElementById('initialView');
        this.tableView = document.getElementById('tableView');
        
        // File handling elements
        this.dropArea = document.getElementById('dropArea');
        this.fileInput = document.getElementById('fileInput');
        this.addFileBtn = document.getElementById('addFileBtn');
        
        // Table elements
        this.dataTable = document.getElementById('dataTable');
        this.fileCount = document.getElementById('fileCount');
        this.exportExcelBtn = document.getElementById('exportExcelBtn');
        this.exportPdfBtn = document.getElementById('exportPdfBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Column visibility toggle
        this.columnToggle = document.getElementById('columnToggle');

        // Zoom controls
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        this.zoomLevelDisplay = document.getElementById('zoomLevel');
        
        // Other UI elements
        this.themeToggle = document.getElementById('themeToggle');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notification = document.getElementById('notification');
        this.statsPanel = document.querySelector('.stats-panel');
    }

    setupEventListeners() {
        // File drop events
        this.dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropArea.classList.add('drag-over');
        });

        this.dropArea.addEventListener('dragleave', () => {
            this.dropArea.classList.remove('drag-over');
        });

        this.dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files)
                .filter(file => file.name.endsWith('.xlsx'));
            this.handleFileSelect(files);
        });

        // File input events
        this.fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files)
                .filter(file => file.name.endsWith('.xlsx'));
            this.handleFileSelect(files);
        });

        this.dropArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Button events
        this.addFileBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        this.exportPdfBtn.addEventListener('click', () => this.exportToPDF());

        this.clearBtn.addEventListener('click', () => {
            this.clearData();
        });

        this.columnToggle.addEventListener('click', () => {
            this.toggleColumnVisibility();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Zoom controls
        this.zoomInBtn.addEventListener('click', () => this.adjustZoom(25));
        this.zoomOutBtn.addEventListener('click', () => this.adjustZoom(-25));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.adjustZoom(25);
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.adjustZoom(-25);
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.zoomLevel = 100;
                    this.zoomLevelDisplay.textContent = '100%';
                    this.dataTable.style.transform = 'scale(1)';
                    const tableContainer = this.dataTable.closest('.table-container');
                    tableContainer.style.width = '100%';
                }
            }
        });

        // Cell tooltips
        this.dataTable.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'TD') {
                const cellValue = e.target.textContent;
                const cellClass = e.target.className;
                let status = '';

                if (cellClass.includes('match')) status = 'Exact Match';
                else if (cellClass.includes('partial-match')) status = 'Partial Match';
                else if (cellClass.includes('mismatch')) status = 'Mismatch';
                else if (cellClass.includes('empty')) status = 'Empty Field';

                e.target.setAttribute('data-tooltip', `${status}\nValue: ${cellValue}`);
            }
        });
    }

    adjustZoom(change) {
        const newZoom = Math.max(25, Math.min(200, this.zoomLevel + change));
        if (newZoom !== this.zoomLevel) {
            this.zoomLevel = newZoom;
            this.zoomLevelDisplay.textContent = `${this.zoomLevel}%`;
            this.dataTable.style.transform = `scale(${this.zoomLevel / 100})`;
            
            // Adjust table container for zoom
            const tableContainer = this.dataTable.closest('.table-container');
            if (this.zoomLevel > 100) {
                tableContainer.style.width = `${this.zoomLevel}%`;
            } else {
                tableContainer.style.width = '100%';
            }
        }
    }

    initializeTheme() {
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
        const icon = this.themeToggle.querySelector('i');
        icon.classList.replace(this.darkMode ? 'fa-moon' : 'fa-sun', 
                             this.darkMode ? 'fa-sun' : 'fa-moon');
    }

    showNotification(type, message) {
        const icon = this.notification.querySelector('.notification-icon');
        const messageEl = this.notification.querySelector('.notification-message');

        icon.className = 'notification-icon fas';
        switch (type) {
            case 'success':
                icon.classList.add('fa-check-circle');
                break;
            case 'error':
                icon.classList.add('fa-exclamation-circle');
                break;
            case 'info':
                icon.classList.add('fa-info-circle');
                break;
        }

        messageEl.textContent = message;
        this.notification.style.display = 'flex';
        
        setTimeout(() => {
            this.notification.style.display = 'none';
        }, 3000);
    }

    showLoadingOverlay() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        this.loadingOverlay.style.display = 'none';
    }

    async handleFileSelect(files) {
        if (!files.length) return;

        try {
            this.showLoadingOverlay();

            for (const file of files) {
                if (!file.name.endsWith('.xlsx')) {
                    this.showNotification('error', `Skipped ${file.name}: Not an XLSX file`);
                    continue;
                }

                const data = await this.readExcelFile(file);
                await this.processExcelData(data, file.name);
                this.showNotification('success', `File "${file.name}" processed successfully`);
            }

            if (this.files.length >= 2) {
                this.initialView.style.display = 'none';
                this.tableView.style.display = 'block';
                this.updateStatistics();
            } else {
                this.showNotification('info', 'Please upload at least 2 files to compare');
            }

        } catch (error) {
            this.showNotification('error', error.message);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true,
                        dateNF: 'yyyy-mm-dd'
                    });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                        header: 1,
                        raw: false,
                        dateNF: 'yyyy-mm-dd'
                    });
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Error reading ${file.name}: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsArrayBuffer(file);
        });
    }

    async processExcelData(data, fileName) {
        if (data.length === 0) {
            throw new Error('File is empty');
        }

        const headers = data[0];
        const rows = data.slice(1);

        // Verify first column matches across files
        const firstColumnData = rows.map(row => String(row[0] || '').trim());
        if (this.files.length > 0) {
            const existingFirstColumn = this.files[0].data.map(row => String(row[0] || '').trim());
            const mismatch = firstColumnData.some((value, index) => 
                value !== existingFirstColumn[index] && 
                index < Math.min(firstColumnData.length, existingFirstColumn.length)
            );
            if (mismatch) {
                throw new Error('First column values must match across all files');
            }
        }

        this.rowCount = Math.max(this.rowCount, rows.length);
        this.files.push({ name: fileName, headers, data: rows });
        this.updateView();
    }

    updateView() {
        if (this.files.length === 0) return;

        const allHeaders = this.files[0].headers.slice(1);
        let tableHtml = '<thead><tr><th>' + this.files[0].headers[0] + '</th>';
        
        this.cellStyles = [];
        this.cellStyles.push(new Array(1 + allHeaders.length * this.files.length).fill('header'));

        allHeaders.forEach(header => {
            this.files.forEach(file => {
                tableHtml += `<th>${header} (${file.name})</th>`;
            });
        });
        tableHtml += '</tr></thead><tbody>';

        const rows = this.files[0].data;
        rows.forEach((row, rowIndex) => {
            tableHtml += `<tr><td>${row[0]}</td>`;
            const rowStyles = [null];

            allHeaders.forEach((_, headerIndex) => {
                const colIndex = headerIndex + 1;
                const values = this.files.map(file => {
                    const value = file.data[rowIndex]?.[colIndex];
                    return value !== undefined ? String(value).trim() : '';
                });
                
                values.forEach((value, fileIndex) => {
                    const cellClass = this.getCellClass(values);
                    const isLastFileInGroup = fileIndex === this.files.length - 1;
                    const groupEndClass = isLastFileInGroup ? ' column-group-end' : '';
                    tableHtml += `<td class="${cellClass}${groupEndClass}">${value}</td>`;
                    rowStyles.push(cellClass);
                });
            });
            tableHtml += '</tr>';
            this.cellStyles.push(rowStyles);
        });

        tableHtml += '</tbody>';
        this.dataTable.innerHTML = tableHtml;
        this.fileCount.textContent = `${this.files.length} files loaded`;
        this.updateStatistics();
    }

    getCellClass(values) {
        const emptyCount = values.filter(v => v === '').length;
        const nonEmptyValues = values.filter(v => v !== '');
        const uniqueValues = [...new Set(nonEmptyValues)];
        
        if (uniqueValues.length === 0) return 'empty';
        
        if (emptyCount > 0) {
            return uniqueValues.length === 1 ? 'partial-match' : 'mismatch';
        }
        
        if (uniqueValues.length === 1) return 'match';
        if (uniqueValues.length === 2) return 'partial-match';
        return 'mismatch';
    }

    updateStatistics() {
        this.statistics = {
            totalComparisons: 0,
            matches: 0,
            partialMatches: 0,
            mismatches: 0,
            emptyFields: 0
        };

        this.cellStyles.forEach(row => {
            row.forEach(style => {
                if (!style || style === 'header') return;
                this.statistics.totalComparisons++;
                if (style === 'match') this.statistics.matches++;
                else if (style === 'partial-match') this.statistics.partialMatches++;
                else if (style === 'mismatch') this.statistics.mismatches++;
                else if (style === 'empty') this.statistics.emptyFields++;
            });
        });

        const stats = [
            { title: 'Total Comparisons', value: this.statistics.totalComparisons },
            { title: 'Exact Matches', value: this.statistics.matches },
            { title: 'Partial Matches', value: this.statistics.partialMatches },
            { title: 'Mismatches', value: this.statistics.mismatches },
            { title: 'Empty Fields', value: this.statistics.emptyFields }
        ];

        this.statsPanel.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-title">${stat.title}</div>
                <div class="stat-value">${stat.value}</div>
            </div>
        `).join('');
    }

    toggleColumnVisibility() {
        const headers = Array.from(this.dataTable.querySelectorAll('th'));
        const columnMapping = headers.map((header, index) => ({
            index,
            text: header.textContent,
            visible: true
        }));

        const modal = document.createElement('div');
        modal.className = 'column-modal';
        modal.innerHTML = `
            <div class="column-modal-content">
                <h3>Toggle Column Visibility</h3>
                <div class="column-list">
                    ${columnMapping.map(col => `
                        <label class="column-toggle">
                            <input type="checkbox" ${col.visible ? 'checked' : ''} data-column="${col.index}">
                            ${col.text}
                        </label>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="control-btn" id="applyColumns">Apply</button>
                    <button class="control-btn" id="cancelColumns">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('applyColumns').addEventListener('click', () => {
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((checkbox, index) => {
                const cells = this.dataTable.querySelectorAll(`td:nth-child(${index + 1}), th:nth-child(${index + 1})`);
                cells.forEach(cell => {
                    cell.style.display = checkbox.checked ? '' : 'none';
                });
            });
            document.body.removeChild(modal);
        });

        document.getElementById('cancelColumns').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async exportToPDF() {
        if (this.files.length === 0) {
            this.showNotification('error', 'No data to export');
            return;
        }
    
        try {
            this.showLoadingOverlay();
    
            const container = document.createElement('div');
            container.className = 'pdf-container';
    
            // Clone and enhance table styling
            const tableClone = this.dataTable.cloneNode(true);
            
            // Calculate table dimensions
            const columnCount = tableClone.rows[0].cells.length;
            const minCellWidth = 20; // minimum width in mm
            const totalTableWidth = columnCount * minCellWidth;
            
            // Calculate required page size
            // A4 landscape width is 297mm, if table is wider, we need to adjust
            const standardA4Width = 297;
            const standardA4Height = 210;
            let pageWidth = standardA4Width;
            let pageHeight = standardA4Height;
            
            // If table is wider than A4 landscape, calculate new dimensions
            if (totalTableWidth > standardA4Width - 30) { // 30mm for margins
                // Calculate required width with margins
                pageWidth = totalTableWidth + 30;
                // Maintain aspect ratio similar to A4
                pageHeight = (pageWidth * standardA4Height) / standardA4Width;
            }
    
            // Add title
            const title = document.createElement('h2');
            title.textContent = 'Excel Comparison Results';
            title.style.textAlign = 'center';
            title.style.marginBottom = '20px';
            title.style.fontSize = '24px';
            title.style.fontWeight = 'bold';
            container.appendChild(title);
    
            // Add statistics
            const statsSection = document.createElement('div');
            statsSection.className = 'stats-section';
            statsSection.innerHTML = `
                <h3 style="font-size: 18px; margin-bottom: 15px;">Comparison Statistics</h3>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${Object.entries(this.statistics).map(([key, value]) => `
                        <div class="stat-item" style="padding: 12px; background: #f8f9fa; border-radius: 6px; font-size: 14px;">
                            <span class="stat-label" style="font-weight: 600;">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span class="stat-value" style="margin-left: 8px;">${value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(statsSection);
    
            // Calculate optimal font size based on column count
            const baseFontSize = 10;
            const fontScale = Math.max(0.6, Math.min(1, standardA4Width / totalTableWidth));
            const adjustedFontSize = Math.floor(baseFontSize * fontScale);
    
            // Apply enhanced table styles
            tableClone.style.width = '100%';
            tableClone.style.borderCollapse = 'collapse';
            tableClone.style.fontSize = `${adjustedFontSize}px`;
            tableClone.style.fontFamily = 'Arial, sans-serif';
            tableClone.style.marginTop = '20px';
    
            // Style cells
            Array.from(tableClone.getElementsByTagName('td')).forEach(cell => {
                cell.style.border = '1px solid #000';
                cell.style.padding = '4px';
                cell.style.lineHeight = '1.3';
                cell.style.whiteSpace = 'nowrap'; // Prevent text wrapping
                
                const originalCell = cell.className;
                if (originalCell.includes('match')) cell.style.backgroundColor = '#C6EFCE';
                if (originalCell.includes('partial-match')) cell.style.backgroundColor = '#FFEB9C';
                if (originalCell.includes('mismatch')) cell.style.backgroundColor = '#FFC7CE';
                if (originalCell.includes('empty')) cell.style.backgroundColor = '#CCE5FF';
            });
    
            // Style headers
            Array.from(tableClone.getElementsByTagName('th')).forEach(header => {
                header.style.backgroundColor = '#f0f0f0';
                header.style.border = '1px solid #000';
                header.style.padding = '4px';
                header.style.fontWeight = 'bold';
                header.style.fontSize = `${adjustedFontSize + 1}px`;
                header.style.textAlign = 'center';
                header.style.whiteSpace = 'nowrap'; // Prevent text wrapping
            });
    
            container.appendChild(tableClone);
    
            // Add footer
            const footer = document.createElement('div');
            footer.className = 'pdf-footer';
            footer.style.marginTop = '20px';
            footer.style.paddingTop = '10px';
            footer.style.borderTop = '1px solid #ddd';
            footer.style.fontSize = '10px';
            footer.style.color = '#666';
            footer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>Generated on: ${new Date().toLocaleString()}</div>
                    <div>Page Size: ${Math.round(pageWidth)}mm x ${Math.round(pageHeight)}mm</div>
                </div>
            `;
            container.appendChild(footer);
    
            // Configure PDF options with dynamic page size
            const opt = {
                margin: [10, 10],
                filename: `comparison_results_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`,
                image: { 
                    type: 'jpeg', 
                    quality: 1.0 
                },
                html2canvas: { 
                    scale: 4,
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    windowWidth: document.documentElement.clientWidth,
                    windowHeight: document.documentElement.clientHeight
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: [pageWidth, pageHeight], // Dynamic page size
                    orientation: 'landscape',
                    compress: true,
                    precision: 16,
                    putOnlyUsedFonts: true
                }
            };
    
            // Generate PDF
            await html2pdf().from(container).set(opt).save();
            
            this.showNotification('success', 'PDF exported successfully');
        } catch (error) {
            console.error('PDF export error:', error);
            this.showNotification('error', 'Error exporting PDF');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    exportToExcel() {
        if (this.files.length === 0) {
            this.showNotification('error', 'No data to export');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const wsData = [];

            // Get the table rows
            const tableRows = Array.from(this.dataTable.querySelectorAll('tr'));
            
            // Process each row
            tableRows.forEach((row, rowIndex) => {
                const rowData = Array.from(row.cells).map(cell => cell.textContent.trim());
                wsData.push(rowData);
            });

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Define styles
            const styleMap = {
                'match': { fill: { fgColor: { rgb: "C6EFCE" }, patternType: 'solid' } },
                'partial-match': { fill: { fgColor: { rgb: "FFEB9C" }, patternType: 'solid' } },
                'mismatch': { fill: { fgColor: { rgb: "FFC7CE" }, patternType: 'solid' } },
                'empty': { fill: { fgColor: { rgb: "CCE5FF" }, patternType: 'solid' } },
                'header': { font: { bold: true }, alignment: { horizontal: 'center' } }
            };

            // Apply stored styles to worksheet
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; R++) {
                for (let C = range.s.c; C <= range.e.c; C++) {
                    const cellRef = XLSX.utils.encode_cell({r: R, c: C});
                    if (!ws[cellRef]) continue;

                    const style = this.cellStyles[R][C];
                    if (style && styleMap[style]) {
                        if (!ws[cellRef].s) ws[cellRef].s = {};
                        Object.assign(ws[cellRef].s, styleMap[style]);
                    }
                }
            }

            // Set column widths
            const colWidths = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
                let maxLength = 0;
                for (let R = range.s.r; R <= range.e.r; R++) {
                    const cellRef = XLSX.utils.encode_cell({r: R, c: C});
                    if (ws[cellRef]) {
                        const value = String(ws[cellRef].v || '');
                        maxLength = Math.max(maxLength, value.length);
                    }
                }
                colWidths[C] = Math.min(50, Math.max(10, maxLength + 2));
            }
            ws['!cols'] = colWidths.map(width => ({ width }));

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Comparison Results');
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            XLSX.writeFile(wb, `comparison_results_${timestamp}.xlsx`, {
                bookType: 'xlsx',
                type: 'binary',
                cellStyles: true
            });
            
            this.showNotification('success', 'Excel file exported successfully');
        } catch (error) {
            console.error('Excel export error:', error);
            this.showNotification('error', 'Error exporting Excel file');
        }
    }

    clearData() {
        this.files = [];
        this.columnMap = {};
        this.rowCount = 0;
        this.cellStyles = [];
        this.dataTable.innerHTML = '';
        this.tableView.style.display = 'none';
        this.initialView.style.display = 'block';
        this.fileCount.textContent = '';
        this.fileInput.value = '';
        this.zoomLevel = 100;
        this.zoomLevelDisplay.textContent = '100%';
        this.dataTable.style.transform = 'scale(1)';
        const tableContainer = this.dataTable.closest('.table-container');
        tableContainer.style.width = '100%';
        this.statistics = {
            totalComparisons: 0,
            matches: 0,
            partialMatches: 0,
            mismatches: 0,
            emptyFields: 0
        };
        this.updateStatistics();
        this.showNotification('info', 'All data cleared');
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.excelComparisonTool = new ExcelComparisonTool();

    // Handle theme preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (window.excelComparisonTool.darkMode !== e.matches) {
            window.excelComparisonTool.toggleTheme();
        }
    });
});