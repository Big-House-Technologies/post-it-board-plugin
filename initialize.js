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

    const createLabeledInput = (elementMap, label, cmd, type = 'text', placeholder = '') => {
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

        input.addEventListener('input', () => publish(cmd, input.value.trim()));

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        elementMap.set(cmd, input)

        return wrapper;
    };

    const createLabeledSelect = (elementMap, label, cmd, options) => {
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
        elementMap.set(cmd, select);
        return wrapper;
    };

    const createTextStyleGroup = (elementMap, label, cmd, options) => {
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

        const state = {};

        options.forEach(opt => {
            const btn = createStyleButton(opt.label);
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
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.minWidth = '120px';

        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.style.fontWeight = '500';
        labelEl.style.marginBottom = '4px';

        const input = document.createElement('input');
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

        const datalist = document.createElement('datalist');
        datalist.id = `${cmd}-datalist`;

        // Populate datalist with suggestions
        for (let i = min; i <= max; i += step) {
            const option = document.createElement('option');
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



    function createToggle(labelText, initialState = false, onChange) {
        let state = initialState; // internal state for this toggle

        // Wrapper
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        wrapper.style.cursor = "pointer";

        // Label
        const label = document.createElement("span");
        label.innerText = labelText;
        label.style.fontSize = "14px";
        label.style.userSelect = "none";

        // Toggle container
        const toggle = document.createElement("div");
        toggle.style.width = "50px";
        toggle.style.height = "25px";
        toggle.style.background = state ? "#4caf50" : "#ccc";
        toggle.style.borderRadius = "25px";
        toggle.style.position = "relative";
        toggle.style.transition = "background 0.3s";

        // Knob
        const knob = document.createElement("div");
        knob.style.width = "21px";
        knob.style.height = "21px";
        knob.style.background = "white";
        knob.style.borderRadius = "50%";
        knob.style.position = "absolute";
        knob.style.top = "2px";
        knob.style.left = state ? "27px" : "2px";
        knob.style.transition = "left 0.3s";

        toggle.appendChild(knob);

        // Toggle click
        wrapper.addEventListener("click", () => {
            state = !state;
            toggle.style.background = state ? "#4caf50" : "#ccc";
            knob.style.left = state ? "27px" : "2px";

            if (typeof onChange === "function") {
                onChange(state);
            }
        });

        wrapper.appendChild(toggle);
        wrapper.appendChild(label);

        return wrapper;
    }



    // === Add Controls to Toolbar ===
    const elementMap = new Map();
    toolbar.appendChild(createLabeledInput(elementMap, 'Font Color', 'color', 'color'));
    toolbar.appendChild(createLabeledSelect(elementMap, 'Font Type', 'font-family', ['', 'Arial', 'Times New Roman', 'Courier', 'Verdana']));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Font Size', 'font-size', 8, 72, 1));

    toolbar.appendChild(createTextStyleGroup(elementMap, 'Text Style', 'text-style', [
        { label: 'Bold', value: 'bold', defaultValue: 'normal', cssKey: "font-weight" },
        { label: 'Italic', value: 'italic', defaultValue: 'normal', cssKey: "font-style" },
        { label: 'Underline', value: 'underline', defaultValue: 'none', cssKey: "text-decoration" },
    ]));
    toolbar.appendChild(createSingleSelectGroup(elementMap, 'Text Align', 'text-align', [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
    ]));
    toolbar.appendChild(createLabeledInput(elementMap, 'Background Color', 'background-color', 'color'));
    toolbar.appendChild(createLabeledInput(elementMap, 'Border Color', 'border-color', 'color'));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Border Width', 'border-width', 0, 20));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Height', 'height', 10, 500));
    toolbar.appendChild(createEditableDropdown(elementMap, 'Width', 'width', 10, 500));

    toolbar.appendChild(createToggle('Editable', true, (editable) => {
        document.dispatchEvent(new CustomEvent('PostIt-config', {
            detail: {
                editable,
            }
        }));
    }));

    const setInputValue = (element, selectedValue) => {
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
            selectedValue ? setActiveStyle(element) : setInactiveStyle(element);
        }
        else if (element instanceof HTMLInputElement) {
            if (element.type === 'color') {
                element.value = selectedValue ? selectedValue : '#000000';
            } else {
                element.value = selectedValue ?
                    (selectedValue.includes('px') ? parseFloat(selectedValue) : selectedValue)
                    : '';
            }
        }
        else if (element instanceof HTMLSelectElement) {
            element.value = selectedValue ? selectedValue : '';
        }
    }

    document.addEventListener('PostIt-selected-publishStyle', (event) => {
        if (event.detail) {
            elementMap.entries().forEach(([key, element]) => {
                const selectedValue = event.detail[key];
                setInputValue(element, selectedValue);
            })
        } else {
            elementMap.entries().forEach(([key, element]) => {
                setInputValue(element, undefined);
            })
        }
    })

    // Add Toolbar into canvas
    if (instance.canvas?.length > 0) {
        instance.canvas[0].appendChild(toolbar);
    }


}