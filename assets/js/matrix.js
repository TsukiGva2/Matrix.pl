document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const statusLight = document.getElementById('status-light');
    const statusText = document.getElementById('status-text');
    const matrixContainer = document.getElementById('matrix-container');
    const logContainer = document.getElementById('log-container');
    const consoleInput = document.getElementById('console-input');
    const submitButton = document.getElementById('submit-button');
    const highlightingLayer = document.getElementById('highlighting-layer');

    let socket;

    // --- Custom Syntax Highlighter ---
    function updateHighlight() {
        const text = consoleInput.value;
        
        // Step 1: Mark all the tokens with non-HTML placeholders.
        // This prevents the highlighting rules from interfering with each other.
        let markedText = text
            .replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, `__VAR__$1__END__`)
            .replace(/\b([0-9]+)\b/g, `__NUM__$1__END__`)
            .replace(/\b([a-z][a-z0-9_]*)\b/g, `__ATOM__$1__END__`);
        
        // Step 2: Escape any potential user-entered HTML from the now-marked text.
        let escapedText = markedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Step 3: Replace the placeholders with the actual HTML spans.
        const highlightedText = escapedText
            .replace(/__VAR__(.*?)__END__/g, '<span class="font-bold text-cyan-400">$1</span>')
            .replace(/__NUM__(.*?)__END__/g, '<span class="text-amber-400">$1</span>')
            .replace(/__ATOM__(.*?)__END__/g, '<span class="text-violet-400">$1</span>');

        highlightingLayer.innerHTML = highlightedText + '\n';
    }

    function syncScroll() {
        highlightingLayer.scrollTop = consoleInput.scrollTop;
        highlightingLayer.scrollLeft = consoleInput.scrollLeft;
    }

    // --- WebSocket Connection ---
    function connect() {
        socket = new WebSocket('ws://localhost:4000/ws');

        socket.onopen = () => {
            updateStatus('Connected', 'bg-green-500', true);
            logMessage('system', 'Connection established.');
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                logMessage('received', data);
                parseAndDisplayMatrix(data);
            } catch (e) {
                logMessage('error', 'Received non-JSON message: ' + event.data);
            }
        };

        socket.onclose = () => {
            updateStatus('Disconnected', 'bg-red-500', false);
            logMessage('system', 'Connection closed. Retrying in 3s...');
            setTimeout(connect, 3000);
        };

        socket.onerror = (error) => {
            logMessage('error', 'A WebSocket error occurred.');
        };
    }

    // --- UI Update Functions ---
    function updateStatus(text, colorClass, isConnected) {
        statusText.textContent = text;
        statusLight.className = `w-4 h-4 rounded-full transition-colors duration-500 ${colorClass}`;
        statusLight.classList.toggle('animate-pulse', isConnected);
    }

    function logMessage(type, content) {
        if (logContainer.querySelector('.italic')) {
            logContainer.innerHTML = '';
        }
        const msgDiv = document.createElement('div');
        let header = '';
        let color = 'text-gray-400';

        if (type === 'sent') { color = 'text-blue-400'; header = '> '; }
        else if (type === 'received') { color = 'text-green-400'; header = '< '; }
        else if (type === 'system') { color = 'text-yellow-400'; }
        else if (type === 'error') { color = 'text-red-400'; }

        msgDiv.className = color;
        const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
        msgDiv.innerHTML = `<span class="font-bold">${header}</span>${contentStr}`;
        logContainer.appendChild(msgDiv);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function renderMatrix(matrixData, targetElement) {
        targetElement.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'inline-flex items-center gap-4 font-mono text-2xl';

        const leftBracket = document.createElement('div');
        const bracketHeight = `h-${matrixData.length * 12}`;
        leftBracket.className = `w-4 ${bracketHeight} border-y-2 border-l-2 border-gray-400 rounded-l-xl`;

        const grid = document.createElement('div');
        const numColumns = matrixData[0] ? matrixData[0].length : 0;
        grid.className = 'grid gap-x-8 gap-y-4';
        grid.style.gridTemplateColumns = `repeat(${numColumns}, minmax(0, 1fr))`;

        matrixData.flat().forEach(cellData => {
            const cell = document.createElement('div');
            cell.className = 'w-10 h-10 flex items-center justify-center';
            cell.textContent = cellData;
            grid.appendChild(cell);
        });

        const rightBracket = document.createElement('div');
        rightBracket.className = `w-4 ${bracketHeight} border-y-2 border-r-2 border-gray-400 rounded-r-xl`;

        wrapper.appendChild(leftBracket);
        wrapper.appendChild(grid);
        wrapper.appendChild(rightBracket);
        targetElement.appendChild(wrapper);
    }
    
    function parseAndDisplayMatrix(prologResponse) {
        try {
            let matrixData;

            prologResponse.forEach((result) => {
                if (result && result.functor === '=' && result.args) {
                    const variableName = result.args[0];
                    const matrixObject = result.args[1];
                    if (matrixObject && matrixObject.functor === 'matriz' && matrixObject.args) {
                        matrixData = matrixObject.args[1];
                        logMessage('system', `Found matrix for variable '${variableName}'.`);   
                    }
                }
            });

            if (matrixData)
                renderMatrix(matrixData, matrixContainer);
        } catch (e) {
            logMessage('error', `Failed to parse matrix from response: ${e.message}`);
        }
    }

    function submitQuery() {
        const rawText = consoleInput.value.trim();
        if (!rawText) return;
        
        let finalCommand = rawText;

        if (!finalCommand.endsWith('.')) {
            finalCommand += '.';
        }

        if (finalCommand && socket && socket.readyState === WebSocket.OPEN) {
            const payload = { code: finalCommand };
            socket.send(JSON.stringify(payload));
            logMessage('sent', payload);
            consoleInput.value = '';
            updateHighlight();
        } else {
            logMessage('error', 'Cannot send command. WebSocket not connected.');
        }
    }

    // --- Event Listeners ---
    submitButton.addEventListener('click', submitQuery);
    consoleInput.addEventListener('input', updateHighlight);
    consoleInput.addEventListener('scroll', syncScroll);
    consoleInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submitQuery();
        }
    });

    interact('#floating-console')
    .draggable({
        allowFrom: '#console-header',
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true
            })
        ],
        autoScroll: true,
        listeners: {
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        },
        modifiers: [
            interact.modifiers.restrictSize({
                min: { width: 350, height: 250 },
            })
        ],
    });

    connect();
    updateHighlight();
});