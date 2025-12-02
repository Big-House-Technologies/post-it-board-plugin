function(instance, context) {

    if (!instance.data) instance.data = {};

    instance.data.postItX = 0;
    instance.data.postItY = 0;
    instance.data.postItText = "";
    instance.data.postItColor = "transparent";
    instance.data.postItID = "";
    instance.data.eventAttached = false;
    instance.data.has_initalized = false;



    // create the toolbar
    const toolbar = document.createElement('div');;
    toolbar.setAttribute('data-scope', 'postIt-plugin');
    toolbar.id = 'post-it-toolbar';
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

    let currentStyle = {}
    const publish = (cmd, val) => {
        if (val !== undefined && val !== null) {
            // If it's a number, append 'px'
            const isNumeric = typeof val === 'number' || (!isNaN(val) && val !== '');
            currentStyle[cmd] = isNumeric ? `${val}px` : val;

            document.dispatchEvent(new CustomEvent('PostIt-updateStyle', {
                detail: { ...currentStyle },
            }));
        }
    };


    const setActiveStyle = (btn) => {
        btn.style.backgroundColor = '#007bff';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #007bff';
    };

    const setInactiveStyle = (btn) => {
        btn.style.backgroundColor = '#fff';
        btn.style.color = '#000';
        btn.style.border = '1px solid #ccc';
    };

    const createStyleButton = (label) => {
        const btn = document.createElement('button');;
        btn.setAttribute('data-scope', 'postIt-plugin');
        btn.innerText = label;
        btn.style.padding = '6px 12px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = '#fff';
        btn.style.transition = 'all 0.2s';
        return btn;
    };

    function createLabeledInputColor(elementMap, label, cmd) {
        const wrapper = document.createElement('div');;
        wrapper.setAttribute('data-scope', 'postIt-plugin');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.minWidth = '150px';
        wrapper.style.position = 'relative';

        // Label
        const labelEl = document.createElement('label');;
        labelEl.setAttribute('data-scope', 'postIt-plugin');
        labelEl.innerText = label;
        labelEl.style.marginBottom = '4px';
        labelEl.style.fontWeight = '500';

        // Color preview box
        const colorBox = document.createElement('div');;
        colorBox.setAttribute('data-scope', 'postIt-plugin');
        colorBox.style.width = '50px';
        colorBox.style.height = '24px';
        colorBox.style.border = '1px solid #ccc';
        colorBox.style.borderRadius = '4px';
        colorBox.style.cursor = 'pointer';
        colorBox.style.background = '#000000';
        colorBox.dataset.type = 'color-picker';

        // Popup container
        const popup = document.createElement('div');
        popup.setAttribute('data-scope', 'postIt-plugin');
        popup.style.position = 'absolute';
        popup.style.top = '50px';
        popup.style.left = '0';
        popup.style.background = '#fff';
        popup.style.border = '1px solid #ccc';
        popup.style.borderRadius = '6px';
        popup.style.padding = '10px';
        popup.style.display = 'none';
        popup.style.flexDirection = 'column';
        popup.style.gap = '6px';
        popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        popup.style.zIndex = '1000';

        // Color palette (general colors)
        const colors = ['green', 'red', 'blue', 'black', 'orange', 'purple', 'white'];
        const paletteRow = document.createElement('div');;
        paletteRow.setAttribute('data-scope', 'postIt-plugin');
        paletteRow.style.display = 'flex';
        paletteRow.style.flexWrap = 'wrap';
        paletteRow.style.gap = '6px';

        colors.forEach(c => {
            const btn = document.createElement('div');;
            btn.setAttribute('data-scope', 'postIt-plugin');
            btn.style.width = '24px';
            btn.style.height = '24px';
            btn.style.borderRadius = '4px';
            btn.style.border = '1px solid #ccc';
            btn.style.background = c;
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => {
                colorBox.style.background = c;
                publish(cmd, c);
                // don't close immediately
            });
            paletteRow.appendChild(btn);
        });

        // Transparent option
        const transparentBtn = document.createElement('button');;
        transparentBtn.setAttribute('data-scope', 'postIt-plugin');
        transparentBtn.innerText = "Transparent";
        transparentBtn.style.padding = "4px 10px";
        transparentBtn.style.fontSize = "13px";
        transparentBtn.style.cursor = "pointer";
        transparentBtn.style.border = "1px solid #ccc";
        transparentBtn.style.borderRadius = "6px";
        transparentBtn.style.background = "#f9f9f9";
        transparentBtn.style.width = "100%";
        transparentBtn.addEventListener('click', () => {
            colorBox.style.background = 'transparent';
            publish(cmd, 'transparent');
            // don't close immediately
        });

        // More colors (label + input)
        const moreWrapper = document.createElement('div');;
        moreWrapper.setAttribute('data-scope', 'postIt-plugin');
        moreWrapper.style.display = 'flex';
        moreWrapper.style.flexDirection = 'column';
        moreWrapper.style.marginTop = "6px";
        moreWrapper.style.borderTop = "1px solid #eee";
        moreWrapper.style.paddingTop = "6px";

        const moreLabel = document.createElement('label');;
        moreLabel.setAttribute('data-scope', 'postIt-plugin');
        moreLabel.innerText = "More colors:";
        moreLabel.style.fontSize = "13px";
        moreLabel.style.marginBottom = "4px";

        const colorInput = document.createElement('input');;
        colorInput.setAttribute('data-scope', 'postIt-plugin');
        colorInput.type = 'color';
        colorInput.style.width = "100%";
        colorInput.style.height = "30px";
        colorInput.style.cursor = "pointer";
        colorInput.style.border = "1px solid #ccc";
        colorInput.style.borderRadius = "6px";

        colorInput.addEventListener('input', () => {
            colorBox.style.background = colorInput.value;
            publish(cmd, colorInput.value);
            // don't close immediately
        });

        moreWrapper.appendChild(moreLabel);
        moreWrapper.appendChild(colorInput);

        // Assemble popup
        popup.appendChild(paletteRow);
        popup.appendChild(transparentBtn);
        popup.appendChild(moreWrapper);

        // Toggle popup on box click
        colorBox.addEventListener('click', () => {
            popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
        });

        // Close popup only when click outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                popup.style.display = 'none';
            }
        });

        // Build final structure
        wrapper.appendChild(labelEl);
        wrapper.appendChild(colorBox);
        wrapper.appendChild(popup);

        elementMap.set(cmd, colorBox);
        return wrapper;
    }



    const createLabeledSelect = (elementMap, label, cmd, options) => {
        const wrapper = document.createElement('div');;
        wrapper.setAttribute('data-scope', 'postIt-plugin');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.minWidth = '140px';

        const labelEl = document.createElement('label');;
        labelEl.setAttribute('data-scope', 'postIt-plugin');
        labelEl.innerText = label;
        labelEl.style.marginBottom = '4px';
        labelEl.style.fontWeight = '500';

        const select = document.createElement('select');;
        select.setAttribute('data-scope', 'postIt-plugin');
        select.style.padding = '6px 10px';
        select.style.border = '1px solid #ccc';
        select.style.borderRadius = '6px';
        select.style.fontSize = '14px';

        options.forEach(opt => {
            const option = document.createElement('option');;
            option.setAttribute('data-scope', 'postIt-plugin');
            option.value = opt;
            option.innerText = opt;
            select.appendChild(option);
        });

        select.addEventListener('change', () => publish(cmd, select.value));

        wrapper.appendChild(labelEl);
        wrapper.appendChild(select);
        elementMap.set(cmd, select);
        return wrapper;
    };

    const createTextStyleGroup = (elementMap, label, cmd, options) => {
        const wrapper = document.createElement('div');;
        wrapper.setAttribute('data-scope', 'postIt-plugin');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';

        const labelEl = document.createElement('label');;
        labelEl.setAttribute('data-scope', 'postIt-plugin');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const btnGroup = document.createElement('div');;
        btnGroup.setAttribute('data-scope', 'postIt-plugin');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '8px';

        const state = {};

        options.forEach(opt => {
            const btn = createStyleButton(opt.label);
            if (opt.style) {
                Object.entries(opt.style).forEach(([key, val]) => {
                    btn.style[key] = val;
                });
            }
            setInactiveStyle(btn);
            btn.addEventListener('click', () => {
                state[opt.value] = !state[opt.value];
                if (state[opt.value]) {
                    setActiveStyle(btn);
                } else {
                    setInactiveStyle(btn);
                }
                const newVal = state[opt.value] ? opt.value : opt.defaultValue
                if (opt.cssKey) {
                    publish(opt.cssKey, newVal);
                } else {
                    publish(cmd, opt.value);
                }

            });
            btnGroup.appendChild(btn);
            elementMap.set(opt.cssKey, btn)
        });

        wrapper.appendChild(labelEl);
        wrapper.appendChild(btnGroup);
        return wrapper;
    };

    const createSingleSelectGroup = (elementMap, label, cmd, options) => {
        const wrapper = document.createElement('div');;
        wrapper.setAttribute('data-scope', 'postIt-plugin');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';

        const labelEl = document.createElement('label');;
        labelEl.setAttribute('data-scope', 'postIt-plugin');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const btnGroup = document.createElement('div');;
        btnGroup.setAttribute('data-scope', 'postIt-plugin');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '8px';

        let selectedBtn = null;

        const optionsElementMap = new Map();
        options.forEach(opt => {
            const btn = createStyleButton(opt.label);
            setInactiveStyle(btn);
            btn.addEventListener('click', () => {
                if (selectedBtn) setInactiveStyle(selectedBtn);
                setActiveStyle(btn);
                selectedBtn = btn;
                publish(cmd, opt.value);
            });
            optionsElementMap.set(opt.value, btn)
            btnGroup.appendChild(btn);
        });

        wrapper.appendChild(labelEl);
        wrapper.appendChild(btnGroup);
        elementMap.set(cmd, optionsElementMap);
        return wrapper;
    };

    const createEditableDropdown = (elementMap, label, cmd, min = 0, max = 100, step = 1) => {
        const container = document.createElement('div');;
        container.setAttribute('data-scope', 'postIt-plugin');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.minWidth = '120px';

        const labelEl = document.createElement('label');;
        labelEl.setAttribute('data-scope', 'postIt-plugin');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const input = document.createElement('input');;
        input.setAttribute('data-scope', 'postIt-plugin');
        input.type = 'number';
        input.min = min;
        input.max = max;
        input.step = step;
        input.placeholder = 'None'; // visually indicates the option to clear
        input.setAttribute('list', `${cmd}-datalist`);
        input.style.padding = '6px 10px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '6px';
        input.style.cursor = 'pointer';

        const datalist = document.createElement('datalist');;
        datalist.setAttribute('data-scope', 'postIt-plugin');
        datalist.id = `${cmd}-datalist`;

        // Populate datalist with suggestions
        for (let i = min; i <= max; i += step) {
            const option = document.createElement('option');;
            option.setAttribute('data-scope', 'postIt-plugin');
            option.value = i;
            datalist.appendChild(option);
        }

        input.addEventListener('change', (_, event) => {
            const val = input.value.trim();
            if (val === '') {
                publish(cmd, null); // Clear the style
            } else {
                let num = Number(val);
                if (num < min) num = min;
                if (num > max) num = max;

                input.value = num;
                if (!isNaN(num)) {
                    publish(cmd, num); // publish adds "px" or unit if needed
                }
            }
        });

        container.appendChild(labelEl);
        container.appendChild(input);
        container.appendChild(datalist);
        elementMap.set(cmd, input);
        return container;
    };

    function createToggle(labelText, initialState = false, onChange, eventListenerConfig) {
        let state = initialState; // internal state for this toggle

        // Wrapper
        const wrapper = document.createElement("div");;
        wrapper.setAttribute('data-scope', 'postIt-plugin');
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        wrapper.style.cursor = "pointer";

        // Label
        const label = document.createElement("span");;
        label.setAttribute('data-scope', 'postIt-plugin');
        label.innerText = labelText;
        label.style.fontSize = "14px";
        label.style.userSelect = "none";

        // Toggle container
        const toggle = document.createElement("div");;
        toggle.setAttribute('data-scope', 'postIt-plugin');
        toggle.style.width = "50px";
        toggle.style.height = "25px";
        toggle.style.background = state ? "#4caf50" : "#ccc";
        toggle.style.borderRadius = "25px";
        toggle.style.position = "relative";
        toggle.style.transition = "background 0.3s";

        // Knob
        const knob = document.createElement("div");;
        knob.setAttribute('data-scope', 'postIt-plugin');
        knob.style.width = "21px";
        knob.style.height = "21px";
        knob.style.background = "white";
        knob.style.borderRadius = "50%";
        knob.style.position = "absolute";
        knob.style.top = "2px";
        knob.style.left = state ? "27px" : "2px";
        knob.style.transition = "left 0.3s";

        toggle.appendChild(knob);

        const setStyleToggle = (state) => {
            toggle.style.background = state ? "#4caf50" : "#ccc";
            knob.style.left = state ? "27px" : "2px";
        }

        // Toggle click
        wrapper.addEventListener("click", () => {
            state = !state;
            setStyleToggle(state);

            if (typeof onChange === "function") {
                onChange(state);
            }
        });

        document.addEventListener(eventListenerConfig.eventName, event => {
            if (event.detail && event.detail[eventListenerConfig.propertyName] !== undefined) {
                state = event.detail[eventListenerConfig.propertyName] ? true : false
                setStyleToggle(state);
            }
        })

        wrapper.appendChild(toggle);
        wrapper.appendChild(label);

        return wrapper;
    }

    // === Add Controls to Toolbar ===
    const elementMap = new Map();
    toolbar.appendChild(createToggle('Create', true, (allowCreation) => {
        document.dispatchEvent(new CustomEvent('PostIt-editable-config', {
            detail: {
                allowCreation,
            }
        }));
    }, { eventName: 'PostIt-edtiable-config-update', propertyName: 'allowCreation' }));
    toolbar.appendChild(createToggle('Edit', true, (allowEdit) => {
        document.dispatchEvent(new CustomEvent('PostIt-editable-config', {
            detail: {
                allowEdit: allowEdit,
            }
        }));
    }, { eventName: 'PostIt-edtiable-config-update', propertyName: 'allowEdit' }));
    toolbar.appendChild(createLabeledInputColor(elementMap, 'Font Color', 'color'));
    toolbar.appendChild(createLabeledSelect(elementMap, 'Font Type', 'font-family', ['', 'Arial', 'Times New Roman', 'Courier', 'Verdana']));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Font Size', 'font-size', 8, 72, 1));

    toolbar.appendChild(createTextStyleGroup(elementMap, 'Text Style', 'text-style', [
        { label: 'B', value: 'bold', defaultValue: 'normal', cssKey: "font-weight", style: { fontWeight: 'bold' } },
        { label: 'I', value: 'italic', defaultValue: 'normal', cssKey: "font-style", style: { fontStyle: 'italic' } },
        { label: 'U', value: 'underline', defaultValue: 'none', cssKey: "text-decoration", style: { textDecoration: 'underline' } },
    ]));
    toolbar.appendChild(createSingleSelectGroup(elementMap, 'Text Align', 'text-align', [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
    ]));
    toolbar.appendChild(createLabeledInputColor(elementMap, 'Background Color', 'background-color'));
    toolbar.appendChild(createLabeledInputColor(elementMap, 'Border Color', 'border-color'));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Border Width', 'border-width', 0, 20));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Height', 'height', 10, 500));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Width', 'width', 10, 500));



    const setInputValue = (element, selectedValue, key) => {
        // How many types of element: Input, Select, Button, Map
        // For Button => selected - active - otw setInactiveStyle
        // For Input/Select => if type color => default value: #00000/''
        // Map - same

        if (element instanceof Map) {
            element.entries().forEach(([key, childElement]) => {
                if (key === selectedValue) {
                    setActiveStyle(childElement);
                } else {
                    setInactiveStyle(childElement);
                }
            })
        } else if (element instanceof HTMLButtonElement) {
            let isSelected = !!selectedValue;
            if (key === 'text-decoration') {
                isSelected = selectedValue !== 'none' && selectedValue;
            } else if (key === 'font-style' || key === 'font-weight') {
                isSelected = selectedValue !== 'normal' && selectedValue;
            }
            // For other buttons, we assume they are toggle buttons
            isSelected ? setActiveStyle(element) : setInactiveStyle(element);
        }
        else if (element instanceof HTMLInputElement) {
            if (element.type === 'color') {
                element.value = selectedValue ? selectedValue : '#000000';
            } else {
                element.value = parseFloat(selectedValue);
            }
        }
        else if (element instanceof HTMLSelectElement) {
            element.value = selectedValue ? selectedValue : '';
        } else if (element instanceof HTMLDivElement) {
            if (element.dataset.type === 'color-picker') {
                element.style.background = selectedValue ? selectedValue : '#000000';
            }
        }
    };

    document.addEventListener('PostIt-selected-publishStyle', (event) => {
        currentStyle = {};
        if (event.detail) {
            elementMap.entries().forEach(([key, element]) => {
                const selectedValue = event.detail[key];
                setInputValue(element, selectedValue, key);
            })
        } else {
            elementMap.entries().forEach(([key, element]) => {
                setInputValue(element, undefined, key);
            })
        }
    })

    // Add Toolbar into canvas
    if (instance.canvas?.length > 0) {
        instance.canvas[0].appendChild(toolbar);
    }


}