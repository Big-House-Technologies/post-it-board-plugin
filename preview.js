function(instance, properties, context) {
    // create the toolbar
    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.gap = '16px';
    toolbar.style.fontFamily = 'Segoe UI, sans-serif';
    toolbar.style.fontSize = '14px';
    toolbar.style.padding = '16px';
    toolbar.style.borderRadius = '12px';
    toolbar.style.backgroundColor = '#f8f9fa';
    toolbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    toolbar.style.maxWidth = '100%';

    let currentStyle = {}``

    const createStyleButton = (label) => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.style.padding = '6px 12px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '6px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = '#fff';
        btn.style.transition = 'all 0.2s';
        return btn;
    };

    const createLabeledInput = (label, cmd, type = 'text', placeholder = '') => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.minWidth = '120px';

        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.style.marginBottom = '4px';
        labelEl.style.fontWeight = '500';

        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.style.padding = '6px 10px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '6px';
        input.style.fontSize = '14px';

        if (type === 'color') {
            input.style.padding = '0';
            input.style.height = '34px';
            input.style.width = '48px';
            input.style.border = 'none';
            input.style.background = 'none';
        }

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        return wrapper;
    };

    const createLabeledSelect = (label, cmd, options) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.minWidth = '140px';

        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.style.marginBottom = '4px';
        labelEl.style.fontWeight = '500';

        const select = document.createElement('select');
        select.style.padding = '6px 10px';
        select.style.border = '1px solid #ccc';
        select.style.borderRadius = '6px';
        select.style.fontSize = '14px';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.innerText = opt;
            select.appendChild(option);
        });

        select.addEventListener('change', () => publish(cmd, select.value));

        wrapper.appendChild(labelEl);
        wrapper.appendChild(select);
        return wrapper;
    };

    const createTextStyleGroup = (label, cmd, options) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';

        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '8px';

        wrapper.appendChild(labelEl);
        wrapper.appendChild(btnGroup);
        return wrapper;
    };

    const createSingleSelectGroup = (label, cmd, options) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';

        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '8px';

        wrapper.appendChild(labelEl);
        wrapper.appendChild(btnGroup);
        return wrapper;
    };

    const createSliderPopup = (label, cmd, min = 0, max = 100, step = 1) => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.minWidth = '120px';

        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const button = document.createElement('button');
        button.innerText = `Set ${label}`;
        button.style.padding = '6px 12px';
        button.style.border = '1px solid #ccc';
        button.style.borderRadius = '6px';
        button.style.backgroundColor = '#fff';
        button.style.cursor = 'pointer';

        const popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.zIndex = '9999';
        popup.style.background = '#fff';
        popup.style.border = '1px solid #ccc';
        popup.style.borderRadius = '8px';
        popup.style.padding = '16px';
        popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        popup.style.display = 'none';
        popup.style.flexDirection = 'column';
        popup.style.gap = '8px';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = (min + max) / 2;

        const sliderLabel = document.createElement('div');
        sliderLabel.innerText = `${label}: ${slider.value}`;

        const applyBtn = document.createElement('button');
        applyBtn.innerText = 'Apply';
        applyBtn.style.padding = '6px 12px';
        applyBtn.style.background = '#007bff';
        applyBtn.style.color = 'white';
        applyBtn.style.border = 'none';
        applyBtn.style.borderRadius = '4px';
        applyBtn.style.cursor = 'pointer';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.border = 'none';
        cancelBtn.style.color = '#888';
        cancelBtn.style.cursor = 'pointer';

        popup.appendChild(sliderLabel);
        popup.appendChild(slider);
        popup.appendChild(applyBtn);
        popup.appendChild(cancelBtn);
        document.body.appendChild(popup);

        container.appendChild(labelEl);
        container.appendChild(button);
        return container;
    };

    // === Add Controls to Toolbar ===
    toolbar.appendChild(createLabeledInput('Font Color', 'color', 'color'));
    toolbar.appendChild(createLabeledSelect('Font Type', 'font-family', ['Arial', 'Times New Roman', 'Courier', 'Verdana']));
    toolbar.appendChild(createSliderPopup('Font Size', 'font-size', 8, 72, 1));

    toolbar.appendChild(createTextStyleGroup('Text Style', 'text-style', [
        { label: 'Bold', value: 'bold', defaultValue: 'normal', cssKey: "font-weight" },
        { label: 'Italic', value: 'italic', defaultValue: 'normal', cssKey: "font-style" },
        { label: 'Underline', value: 'underline', defaultValue: 'none', cssKey: "text-decoration" },
    ]));

    toolbar.appendChild(createSingleSelectGroup('Text Align', 'text-align', [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
    ]));

    // toolbar.appendChild(createLabeledInput('Background Color', 'background-color', 'color'));
    // toolbar.appendChild(createLabeledInput('Border Color', 'border-color', 'color'));
    // toolbar.appendChild(createSliderPopup('Border Width', 'border-width', 0, 20));
    // toolbar.appendChild(createSliderPopup('Height', 'height', 10, 500));
    toolbar.appendChild(createSliderPopup('Width', 'width', 10, 500));


    // Add Toolbar into canvas
    if (instance.canvas?.length > 0) {
        instance.canvas[0].appendChild(toolbar);
    }


}